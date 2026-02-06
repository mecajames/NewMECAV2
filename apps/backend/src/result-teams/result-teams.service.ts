import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ResultTeam } from './result-team.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { TeamMember } from '../teams/team-member.entity';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';

// DTOs
export interface CreateResultTeamDto {
  resultId: string;
  teamId: string;
  memberId?: string;
}

export interface TeamMemberData {
  teamId: string;
  memberId?: string;
}

@Injectable()
export class ResultTeamsService {
  private readonly logger = new Logger(ResultTeamsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Get all result teams for a specific result
   */
  async getResultTeamsByResultId(resultId: string): Promise<ResultTeam[]> {
    const em = this.em.fork();
    return em.find(ResultTeam, { result: resultId }, {
      populate: ['team', 'member'],
    });
  }

  /**
   * Get all result teams for a specific team
   */
  async getResultTeamsByTeamId(teamId: string): Promise<ResultTeam[]> {
    const em = this.em.fork();
    return em.find(ResultTeam, { team: teamId }, {
      populate: ['result', 'member'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all result teams for a specific member
   */
  async getResultTeamsByMemberId(memberId: string): Promise<ResultTeam[]> {
    const em = this.em.fork();
    return em.find(ResultTeam, { member: memberId }, {
      populate: ['result', 'team'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Get team results for a specific season
   */
  async getTeamResultsForSeason(teamId: string, seasonId: string): Promise<ResultTeam[]> {
    const em = this.em.fork();

    // First get all result teams for this team
    const resultTeams = await em.find(ResultTeam, { team: teamId }, {
      populate: ['result', 'member'],
    });

    // Filter by season (via the result's season)
    const filteredResults: ResultTeam[] = [];
    for (const rt of resultTeams) {
      if (rt.result) {
        const result = await em.findOne(CompetitionResult, { id: (rt.result as any).id || rt.result });
        if (result && result.seasonId === seasonId) {
          filteredResults.push(rt);
        }
      }
    }

    return filteredResults;
  }

  // ============================================
  // AGGREGATION METHODS
  // ============================================

  /**
   * Get total points for a team in a season
   */
  async getTeamPointsForSeason(teamId: string, seasonId: string): Promise<number> {
    const em = this.em.fork();

    // Get all result teams for this team
    const resultTeams = await em.find(ResultTeam, { team: teamId }, {
      populate: ['result'],
    });

    let totalPoints = 0;

    for (const rt of resultTeams) {
      if (rt.result) {
        const result = await em.findOne(CompetitionResult, { id: (rt.result as any).id || rt.result });
        if (result && result.seasonId === seasonId) {
          totalPoints += result.pointsEarned || 0;
        }
      }
    }

    return totalPoints;
  }

  /**
   * Get top teams by points for a season
   */
  async getTopTeamsBySeason(
    seasonId: string,
    limit: number = 10,
  ): Promise<{ teamId: string; totalPoints: number }[]> {
    const em = this.em.fork();

    // Get all result teams with their results
    const resultTeams = await em.find(ResultTeam, {}, {
      populate: ['result', 'team'],
    });

    // Aggregate points by team for this season
    const teamPoints = new Map<string, number>();

    for (const rt of resultTeams) {
      if (rt.result && rt.team) {
        const result = await em.findOne(CompetitionResult, { id: (rt.result as any).id || rt.result });
        if (result && result.seasonId === seasonId) {
          const teamId = (rt.team as any).id || rt.team;
          const currentPoints = teamPoints.get(teamId) || 0;
          teamPoints.set(teamId, currentPoints + (result.pointsEarned || 0));
        }
      }
    }

    // Sort and return top teams
    const sortedTeams = Array.from(teamPoints.entries())
      .map(([teamId, totalPoints]) => ({ teamId, totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    return sortedTeams;
  }

  // ============================================
  // WRITE METHODS
  // ============================================

  /**
   * Create a result team entry
   */
  async createResultTeam(data: CreateResultTeamDto): Promise<ResultTeam> {
    const em = this.em.fork();

    const resultTeam = em.create(ResultTeam, {
      id: randomUUID(),
      result: data.resultId,
      team: data.teamId,
      member: data.memberId,
    } as any);

    await em.persistAndFlush(resultTeam);
    return resultTeam;
  }

  /**
   * Delete a result team entry
   */
  async deleteResultTeam(id: string): Promise<void> {
    const em = this.em.fork();

    const resultTeam = await em.findOne(ResultTeam, { id });
    if (!resultTeam) {
      throw new NotFoundException(`ResultTeam with ID ${id} not found`);
    }

    await em.removeAndFlush(resultTeam);
  }

  /**
   * Bulk create result team entries for a single result
   */
  async bulkCreateResultTeams(
    resultId: string,
    teamMembers: TeamMemberData[],
  ): Promise<ResultTeam[]> {
    const em = this.em.fork();

    const resultTeams: ResultTeam[] = [];

    for (const tm of teamMembers) {
      const resultTeam = em.create(ResultTeam, {
        id: randomUUID(),
        result: resultId,
        team: tm.teamId,
        member: tm.memberId,
      } as any);
      em.persist(resultTeam);
      resultTeams.push(resultTeam);
    }

    await em.flush();
    return resultTeams;
  }

  // ============================================
  // AUTO-LINKING METHODS
  // ============================================

  /**
   * NOTE: Team standings are now calculated directly from memberships in StandingsService.
   * Teams are defined by:
   * - Retailers (category=retail) - team name from business_name
   * - Manufacturers (category=manufacturer) - team name from business_name
   * - Team Memberships (name like '%Team%') - team name from team_name field
   * - has_team_addon competitors - team name from team_name field
   *
   * The result_teams table and teams/team_members tables are now deprecated for standings.
   * This auto-linking is kept for backwards compatibility with the legacy LowerHz team.
   */

  /**
   * Find team(s) for a competitor by MECA ID or user ID
   * Checks both legacy teams table AND membership-based teams
   */
  async findTeamsForCompetitor(mecaId?: string, userId?: string): Promise<Array<{ teamId: string; memberId: string; teamName: string; isLegacy: boolean }>> {
    const em = this.em.fork();
    const teams: Array<{ teamId: string; memberId: string; teamName: string; isLegacy: boolean }> = [];

    // 1. Check legacy teams table (team_members)
    if (userId) {
      const legacyMemberships = await em.find(TeamMember, { userId, status: 'active' });
      for (const m of legacyMemberships) {
        // Get team name from teams table
        const team = await em.findOne('Team', { id: m.teamId });
        if (team) {
          teams.push({
            teamId: m.teamId,
            memberId: m.userId,
            teamName: (team as any).name || 'Unknown Team',
            isLegacy: true,
          });
        }
      }
    }

    // 2. Check membership-based teams
    if (mecaId && mecaId !== '999999' && mecaId !== '0') {
      const mecaIdNum = parseInt(mecaId, 10);
      if (!isNaN(mecaIdNum)) {
        // Find membership with team info
        const membershipResult = await em.getConnection().execute(`
          SELECT
            m.id as membership_id,
            m.user_id,
            m.team_name,
            m.business_name,
            m.has_team_addon,
            mtc.name as membership_type_name,
            mtc.category as membership_category,
            p.first_name,
            p.last_name
          FROM memberships m
          JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
          LEFT JOIN profiles p ON p.id = m.user_id
          WHERE m.status = 'active'
          AND m.meca_id = $1
          AND (
            mtc.category = 'retail'
            OR mtc.category = 'manufacturer'
            OR mtc.category = 'team'
            OR mtc.name LIKE '%Team%'
            OR m.has_team_addon = true
          )
          LIMIT 1
        `, [mecaIdNum]);

        if (membershipResult.length > 0) {
          const m = membershipResult[0];
          let teamName: string;

          if (m.membership_category === 'retail' || m.membership_category === 'manufacturer') {
            teamName = m.business_name || m.team_name || `${m.first_name}_${m.last_name}`.toLowerCase();
          } else {
            if (m.team_name && m.team_name.trim()) {
              teamName = m.team_name.trim();
            } else {
              teamName = `${m.first_name}_${m.last_name}_team_not_populated`.toLowerCase().replace(/\s+/g, '_');
            }
          }

          // Check if this team already exists in the array (avoid duplicates)
          const normalizedName = teamName.toLowerCase().trim();
          if (!teams.some(t => t.teamName.toLowerCase().trim() === normalizedName)) {
            teams.push({
              teamId: m.membership_id, // Use membership ID as team ID for membership-based teams
              memberId: m.user_id,
              teamName,
              isLegacy: false,
            });
          }
        }
      }
    }

    return teams;
  }

  /**
   * Automatically create ResultTeam entry when a competition result is created
   * Called from CompetitionResultsService.create()
   *
   * NOTE: This is now primarily for legacy team support (teams table).
   * Team standings are calculated directly from memberships in StandingsService.
   */
  async autoLinkResultToTeam(resultId: string, mecaId?: string, competitorId?: string): Promise<ResultTeam[]> {
    const em = this.em.fork();
    const created: ResultTeam[] = [];

    // Find teams for this competitor (both legacy and membership-based)
    const teams = await this.findTeamsForCompetitor(mecaId, competitorId);

    // Only create ResultTeam entries for legacy teams (from teams table)
    // Membership-based teams don't need entries in result_teams - they're calculated on the fly
    const legacyTeams = teams.filter(t => t.isLegacy);

    if (legacyTeams.length === 0) {
      return created;
    }

    // Check if links already exist
    const existingLinks = await em.find(ResultTeam, { result: resultId });
    const existingTeamIds = new Set(existingLinks.map(l => (l.team as any)?.id || l.team));

    for (const team of legacyTeams) {
      // Skip if already linked
      if (existingTeamIds.has(team.teamId)) {
        continue;
      }

      const resultTeam = em.create(ResultTeam, {
        id: randomUUID(),
        result: resultId,
        team: team.teamId,
        member: team.memberId,
      } as any);

      em.persist(resultTeam);
      created.push(resultTeam);
    }

    if (created.length > 0) {
      await em.flush();
      this.logger.log(`Auto-linked result ${resultId} to ${created.length} legacy team(s)`);
    }

    return created;
  }

  /**
   * Sync all existing competition results to teams
   * This is a one-time migration to populate existing data
   */
  async syncAllResultsToTeams(): Promise<{ processed: number; linked: number; errors: number }> {
    const em = this.em.fork();
    let processed = 0;
    let linked = 0;
    let errors = 0;

    this.logger.log('Starting bulk sync of competition results to teams...');

    // Get all competition results
    const results = await em.find(CompetitionResult, {}, {
      populate: ['competitor'],
    });

    this.logger.log(`Found ${results.length} competition results to process`);

    // Build a map of MECA ID -> team memberships for efficiency
    const mecaIdToTeams = new Map<string, Array<{ teamId: string; userId: string }>>();
    const userIdToTeams = new Map<string, Array<{ teamId: string; userId: string }>>();

    // Get all active team memberships
    const allTeamMemberships = await em.find(TeamMember, { status: 'active' });

    // Get all profiles with MECA IDs
    const profilesWithMecaId = await em.find(Profile, { meca_id: { $ne: null } });
    const userIdToMecaId = new Map<string, string>();
    for (const p of profilesWithMecaId) {
      if (p.meca_id) {
        userIdToMecaId.set(p.id, p.meca_id);
      }
    }

    // Build lookup maps
    for (const tm of allTeamMemberships) {
      // Add to userIdToTeams
      if (!userIdToTeams.has(tm.userId)) {
        userIdToTeams.set(tm.userId, []);
      }
      userIdToTeams.get(tm.userId)!.push({ teamId: tm.teamId, userId: tm.userId });

      // Add to mecaIdToTeams using the user's MECA ID
      const mecaId = userIdToMecaId.get(tm.userId);
      if (mecaId) {
        if (!mecaIdToTeams.has(mecaId)) {
          mecaIdToTeams.set(mecaId, []);
        }
        mecaIdToTeams.get(mecaId)!.push({ teamId: tm.teamId, userId: tm.userId });
      }
    }

    this.logger.log(`Built lookup maps: ${mecaIdToTeams.size} MECA IDs, ${userIdToTeams.size} user IDs with team memberships`);

    // Get existing result-team links to avoid duplicates
    const existingLinks = await em.find(ResultTeam, {});
    const existingLinkSet = new Set<string>();
    for (const link of existingLinks) {
      const resultId = (link.result as any)?.id || link.result;
      const teamId = (link.team as any)?.id || link.team;
      existingLinkSet.add(`${resultId}:${teamId}`);
    }

    this.logger.log(`Found ${existingLinks.length} existing result-team links`);

    // Process each result
    const batchSize = 500;
    const newLinks: ResultTeam[] = [];

    for (const result of results) {
      processed++;

      try {
        // Find teams for this competitor
        let teams: Array<{ teamId: string; userId: string }> = [];

        // Try by competitor ID first (more reliable)
        if (result.competitor?.id) {
          teams = userIdToTeams.get(result.competitor.id) || [];
        }

        // If no teams found by user ID, try by MECA ID
        if (teams.length === 0 && result.mecaId && result.mecaId !== '999999' && result.mecaId !== '0') {
          teams = mecaIdToTeams.get(result.mecaId) || [];
        }

        // Create links for each team
        for (const team of teams) {
          const linkKey = `${result.id}:${team.teamId}`;
          if (existingLinkSet.has(linkKey)) {
            continue; // Skip existing links
          }

          const resultTeam = em.create(ResultTeam, {
            id: randomUUID(),
            result: result.id,
            team: team.teamId,
            member: team.userId,
          } as any);

          newLinks.push(resultTeam);
          existingLinkSet.add(linkKey); // Mark as created to avoid duplicates in this batch
          linked++;
        }

        // Flush in batches
        if (newLinks.length >= batchSize) {
          for (const link of newLinks) {
            em.persist(link);
          }
          await em.flush();
          this.logger.log(`Flushed batch: ${linked} links created so far`);
          newLinks.length = 0; // Clear the array
        }
      } catch (error: any) {
        this.logger.error(`Error processing result ${result.id}: ${error.message}`);
        errors++;
      }

      if (processed % 1000 === 0) {
        this.logger.log(`Processed ${processed}/${results.length} results...`);
      }
    }

    // Flush remaining links
    if (newLinks.length > 0) {
      for (const link of newLinks) {
        em.persist(link);
      }
      await em.flush();
    }

    this.logger.log(`Sync complete: ${processed} processed, ${linked} linked, ${errors} errors`);
    return { processed, linked, errors };
  }

  /**
   * Get all teams with their members (for admin debugging)
   */
  async getAllTeamsWithMembers(): Promise<Array<{
    teamId: string;
    teamName: string;
    memberCount: number;
    members: Array<{
      userId: string;
      mecaId: string | null;
      name: string;
      role: string;
    }>;
  }>> {
    const em = this.em.fork();

    // Import Team entity dynamically to avoid circular dependency
    const { Team } = await import('../teams/team.entity');

    // Get all active teams
    const teams = await em.find(Team, { isActive: true });

    const result: Array<{
      teamId: string;
      teamName: string;
      memberCount: number;
      members: Array<{
        userId: string;
        mecaId: string | null;
        name: string;
        role: string;
      }>;
    }> = [];

    for (const team of teams) {
      // Get all active members
      const members = await em.find(TeamMember, { teamId: team.id, status: 'active' });

      const memberDetails: Array<{
        userId: string;
        mecaId: string | null;
        name: string;
        role: string;
      }> = [];

      for (const member of members) {
        const profile = await em.findOne(Profile, { id: member.userId });
        memberDetails.push({
          userId: member.userId,
          mecaId: profile?.meca_id || null,
          name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown',
          role: member.role,
        });
      }

      result.push({
        teamId: team.id,
        teamName: team.name,
        memberCount: members.length,
        members: memberDetails,
      });
    }

    return result;
  }
}
