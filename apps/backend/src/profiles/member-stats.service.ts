import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

export interface MemberStats {
  totalOrders: number;
  eventsAttended: number;
  trophiesWon: number;
  totalSpent: number;
  teamName: string | null;
  recentActivity: ActivityItem[];
  upcomingEvents: UpcomingEvent[];
}

export interface ActivityItem {
  id: string;
  type: 'registration' | 'payment' | 'membership' | 'result' | 'team';
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface UpcomingEvent {
  id: string;
  name: string;
  eventDate: Date;
  location: string;
  registrationStatus: string;
}

@Injectable()
export class MemberStatsService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Get comprehensive statistics for a member
   */
  async getMemberStats(userId: string): Promise<MemberStats> {
    const em = this.em.fork();

    // Run all queries in parallel for performance
    const [
      orderStats,
      eventsAttended,
      competitionResults,
      teamInfo,
      recentActivity,
      upcomingEvents,
    ] = await Promise.all([
      this.getOrderStats(em, userId),
      this.getEventsAttendedCount(em, userId),
      this.getCompetitionResults(em, userId),
      this.getTeamInfo(em, userId),
      this.getRecentActivity(em, userId),
      this.getUpcomingEvents(em, userId),
    ]);

    return {
      totalOrders: orderStats.count,
      eventsAttended,
      trophiesWon: competitionResults.trophies,
      totalSpent: orderStats.totalSpent,
      teamName: teamInfo?.name || null,
      recentActivity,
      upcomingEvents,
    };
  }

  /**
   * Get order statistics (count and total spent)
   */
  private async getOrderStats(
    em: EntityManager,
    userId: string,
  ): Promise<{ count: number; totalSpent: number }> {
    const result = await em.getConnection().execute(`
      SELECT
        COUNT(*)::int as count,
        COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)::float as total_spent
      FROM orders
      WHERE member_id = ? AND status IN ('completed', 'paid')
    `, [userId]);

    return {
      count: result[0]?.count || 0,
      totalSpent: parseFloat(result[0]?.total_spent || '0'),
    };
  }

  /**
   * Get count of events the member has attended (checked in)
   */
  private async getEventsAttendedCount(em: EntityManager, userId: string): Promise<number> {
    const result = await em.getConnection().execute(`
      SELECT COUNT(DISTINCT er.event_id)::int as count
      FROM event_registrations er
      JOIN events e ON er.event_id = e.id
      WHERE er.user_id = ?
        AND (er.checked_in = true OR e.status = 'completed')
    `, [userId]);

    return result[0]?.count || 0;
  }

  /**
   * Get competition results statistics (placements and trophies)
   */
  private async getCompetitionResults(
    em: EntityManager,
    userId: string,
  ): Promise<{ trophies: number; placements: { first: number; second: number; third: number } }> {
    // Count top 3 placements as "trophies"
    const result = await em.getConnection().execute(`
      SELECT
        COUNT(*) FILTER (WHERE placement = 1)::int as first_place,
        COUNT(*) FILTER (WHERE placement = 2)::int as second_place,
        COUNT(*) FILTER (WHERE placement = 3)::int as third_place,
        COUNT(*) FILTER (WHERE placement <= 3)::int as total_trophies
      FROM competition_results
      WHERE competitor_id = ? AND placement IS NOT NULL AND placement > 0
    `, [userId]);

    return {
      trophies: result[0]?.total_trophies || 0,
      placements: {
        first: result[0]?.first_place || 0,
        second: result[0]?.second_place || 0,
        third: result[0]?.third_place || 0,
      },
    };
  }

  /**
   * Get team information for the member
   */
  private async getTeamInfo(
    em: EntityManager,
    userId: string,
  ): Promise<{ name: string; id: string } | null> {
    // Check memberships for team name first
    const membershipResult = await em.getConnection().execute(`
      SELECT team_name, id
      FROM memberships
      WHERE user_id = ? AND team_name IS NOT NULL AND team_name != ''
      ORDER BY end_date DESC
      LIMIT 1
    `, [userId]);

    if (membershipResult[0]?.team_name) {
      return {
        name: membershipResult[0].team_name,
        id: membershipResult[0].id,
      };
    }

    // Check teams table for team membership
    const teamResult = await em.getConnection().execute(`
      SELECT t.name, t.id
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ? AND tm.status = 'active'
      LIMIT 1
    `, [userId]);

    if (teamResult[0]) {
      return {
        name: teamResult[0].name,
        id: teamResult[0].id,
      };
    }

    return null;
  }

  /**
   * Get recent activity for the member
   */
  private async getRecentActivity(
    em: EntityManager,
    userId: string,
    limit: number = 10,
  ): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    // Get recent event registrations
    const registrations = await em.getConnection().execute(`
      SELECT er.id, er.created_at, e.title as event_name, er.status
      FROM event_registrations er
      JOIN events e ON er.event_id = e.id
      WHERE er.user_id = ?
      ORDER BY er.created_at DESC
      LIMIT 5
    `, [userId]);

    for (const reg of registrations) {
      activities.push({
        id: reg.id,
        type: 'registration',
        description: `Registered for ${reg.event_name}`,
        timestamp: new Date(reg.created_at),
        metadata: { status: reg.status },
      });
    }

    // Get recent competition results
    const results = await em.getConnection().execute(`
      SELECT cr.id, cr.created_at, e.title as event_name, cr.placement, cc.name as class_name
      FROM competition_results cr
      JOIN events e ON cr.event_id = e.id
      LEFT JOIN competition_classes cc ON cr.class_id = cc.id
      WHERE cr.competitor_id = ?
      ORDER BY cr.created_at DESC
      LIMIT 5
    `, [userId]);

    for (const result of results) {
      const placeText = result.placement ? `${this.getOrdinal(result.placement)} place` : 'competed';
      activities.push({
        id: result.id,
        type: 'result',
        description: `${placeText} in ${result.class_name || 'competition'} at ${result.event_name}`,
        timestamp: new Date(result.created_at),
        metadata: { place: result.placement },
      });
    }

    // Get recent orders
    const orders = await em.getConnection().execute(`
      SELECT id, created_at, order_number, total_amount, status
      FROM orders
      WHERE member_id = ? AND status IN ('completed', 'paid')
      ORDER BY created_at DESC
      LIMIT 3
    `, [userId]);

    for (const order of orders) {
      activities.push({
        id: order.id,
        type: 'payment',
        description: `Order #${order.order_number} - $${order.total_amount}`,
        timestamp: new Date(order.created_at),
        metadata: { total: order.total_amount, status: order.status },
      });
    }

    // Get membership changes
    const memberships = await em.getConnection().execute(`
      SELECT m.id, m.created_at, mtc.name as type_name
      FROM memberships m
      LEFT JOIN membership_type_configs mtc ON m.membership_type_config_id = mtc.id
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
      LIMIT 3
    `, [userId]);

    for (const membership of memberships) {
      activities.push({
        id: membership.id,
        type: 'membership',
        description: `${membership.type_name || 'Membership'} activated`,
        timestamp: new Date(membership.created_at),
      });
    }

    // Sort by timestamp descending and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get upcoming events the member is registered for
   */
  private async getUpcomingEvents(
    em: EntityManager,
    userId: string,
    limit: number = 5,
  ): Promise<UpcomingEvent[]> {
    const result = await em.getConnection().execute(`
      SELECT
        e.id,
        e.title as name,
        e.event_date,
        COALESCE(e.venue_city || ', ' || e.venue_state, e.venue_city, e.venue_state, 'TBD') as location,
        er.status as registration_status
      FROM event_registrations er
      JOIN events e ON er.event_id = e.id
      WHERE er.user_id = ?
        AND e.event_date >= CURRENT_DATE
        AND e.status NOT IN ('cancelled', 'completed')
      ORDER BY e.event_date ASC
      LIMIT ?
    `, [userId, limit]);

    return result.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      eventDate: new Date(row.event_date as string),
      location: row.location as string,
      registrationStatus: row.registration_status as string,
    }));
  }

  /**
   * Helper to get ordinal suffix for numbers
   */
  private getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
