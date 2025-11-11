import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { CompetitionResult } from './competition-results.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';

@Injectable()
export class CompetitionResultsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<CompetitionResult[]> {
    const em = this.em.fork();
    return em.find(CompetitionResult, {}, {
      populate: ['competitor'],
    });
  }

  async findById(id: string): Promise<CompetitionResult> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }
    return result;
  }

  async findByEvent(eventId: string): Promise<CompetitionResult[]> {
    const em = this.em.fork();
    return em.find(CompetitionResult, { eventId }, {
      orderBy: { placement: 'ASC' },
      populate: ['competitor'],
    });
  }

  async findByCompetitor(competitorId: string): Promise<CompetitionResult[]> {
    const em = this.em.fork();
    return em.find(CompetitionResult, { competitorId });
  }

  async create(data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const em = this.em.fork();

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = { ...data };

    // Capture event_id for points recalculation
    const eventId = (data as any).event_id;

    // Handle event_id by creating a Reference
    if ((data as any).event_id !== undefined) {
      transformedData.event = Reference.createFromPK(Event, (data as any).event_id);
      delete transformedData.event_id;
    }

    // Handle competitor_id by creating a Reference
    if ((data as any).competitor_id !== undefined) {
      transformedData.competitor = Reference.createFromPK(Profile, (data as any).competitor_id);
      delete transformedData.competitor_id;
    }
    if ((data as any).competitor_name !== undefined) {
      transformedData.competitorName = (data as any).competitor_name;
      delete transformedData.competitor_name;
    }
    if ((data as any).meca_id !== undefined) {
      transformedData.mecaId = (data as any).meca_id;
      delete transformedData.meca_id;
    }
    if ((data as any).competition_class !== undefined) {
      transformedData.competitionClass = (data as any).competition_class;
      delete transformedData.competition_class;
    }
    if ((data as any).class_id !== undefined) {
      transformedData.classId = (data as any).class_id;
      delete transformedData.class_id;
    }
    if ((data as any).points_earned !== undefined) {
      transformedData.pointsEarned = (data as any).points_earned;
      delete transformedData.points_earned;
    }
    if ((data as any).vehicle_info !== undefined) {
      transformedData.vehicleInfo = (data as any).vehicle_info;
      delete transformedData.vehicle_info;
    }
    if ((data as any).season_id !== undefined) {
      transformedData.seasonId = (data as any).season_id;
      delete transformedData.season_id;
    }
    if ((data as any).created_by !== undefined) {
      transformedData.createdBy = (data as any).created_by;
      delete transformedData.created_by;
    }

    const result = em.create(CompetitionResult, transformedData);
    await em.persistAndFlush(result);

    // Automatically recalculate points for all results in this event
    if (eventId) {
      await this.updateEventPoints(eventId);

      // Reload the result to get updated points
      await em.refresh(result);
    }

    return result;
  }

  async update(id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id }, { populate: ['event'] });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }

    // Capture event_id for points recalculation
    const eventId = (data as any).event_id || result.eventId;

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = { ...data };

    // Handle event_id by creating a Reference
    if ((data as any).event_id !== undefined) {
      transformedData.event = Reference.createFromPK(Event, (data as any).event_id);
      delete transformedData.event_id;
    }

    // Handle competitor_id by creating a Reference
    if ((data as any).competitor_id !== undefined) {
      transformedData.competitor = Reference.createFromPK(Profile, (data as any).competitor_id);
      delete transformedData.competitor_id;
    }
    if ((data as any).competitor_name !== undefined) {
      transformedData.competitorName = (data as any).competitor_name;
      delete transformedData.competitor_name;
    }
    if ((data as any).meca_id !== undefined) {
      transformedData.mecaId = (data as any).meca_id;
      delete transformedData.meca_id;
    }
    if ((data as any).competition_class !== undefined) {
      transformedData.competitionClass = (data as any).competition_class;
      delete transformedData.competition_class;
    }
    if ((data as any).class_id !== undefined) {
      transformedData.classId = (data as any).class_id;
      delete transformedData.class_id;
    }
    if ((data as any).points_earned !== undefined) {
      transformedData.pointsEarned = (data as any).points_earned;
      delete transformedData.points_earned;
    }
    if ((data as any).vehicle_info !== undefined) {
      transformedData.vehicleInfo = (data as any).vehicle_info;
      delete transformedData.vehicle_info;
    }
    if ((data as any).season_id !== undefined) {
      transformedData.seasonId = (data as any).season_id;
      delete transformedData.season_id;
    }

    em.assign(result, transformedData);
    await em.flush();

    // Automatically recalculate points for all results in this event
    if (eventId) {
      await this.updateEventPoints(eventId);

      // Reload the result to get updated points
      await em.refresh(result);
    }

    return result;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }
    await em.removeAndFlush(result);
  }

  async getLeaderboard(seasonId?: string): Promise<any[]> {
    const em = this.em.fork();

    // Build the query filter
    const filter: any = {};
    if (seasonId) {
      filter.seasonId = seasonId;
    }

    // Fetch all results with the filter
    const results = await em.find(CompetitionResult, filter, {
      populate: ['competitor']
    });

    // Aggregate results by competitor
    const aggregated = new Map<string, any>();

    for (const result of results) {
      const competitorKey = result.competitor?.id || result.competitorName;

      if (!aggregated.has(competitorKey)) {
        aggregated.set(competitorKey, {
          competitor_id: result.competitor?.id || '',
          competitor_name: result.competitorName,
          total_points: 0,
          events_participated: 0,
          first_place: 0,
          second_place: 0,
          third_place: 0,
          meca_id: result.mecaId || result.competitor?.meca_id,
          membership_expiry: result.competitor?.membership_expiry,
        });
      }

      const entry = aggregated.get(competitorKey);
      entry.total_points += result.pointsEarned || 0;
      entry.events_participated += 1;

      if (result.placement === 1) entry.first_place += 1;
      if (result.placement === 2) entry.second_place += 1;
      if (result.placement === 3) entry.third_place += 1;
    }

    // Convert to array and sort by total points descending
    return Array.from(aggregated.values())
      .sort((a, b) => b.total_points - a.total_points);
  }

  /**
   * Calculate points for a single result based on placement and event multiplier
   * Points are awarded to top 5 competitors only
   * Base points: 1st=5, 2nd=4, 3rd=3, 4th=2, 5th=1
   * Final points = base points × multiplier
   */
  private calculatePoints(placement: number, multiplier: number, format: string): number {
    // No points for multiplier 0 (non-competitive events)
    if (multiplier === 0) {
      return 0;
    }

    // Only top 5 placements receive points
    if (placement < 1 || placement > 5) {
      return 0;
    }

    // Base points for each placement
    const basePoints: { [key: number]: number } = {
      1: 5,
      2: 4,
      3: 3,
      4: 2,
      5: 1,
    };

    const points = basePoints[placement] || 0;
    return points * multiplier;
  }

  /**
   * Check if a member is eligible for points
   */
  private isMemberEligible(mecaId: string | undefined, membershipExpiry: Date | undefined): boolean {
    // Guest competitors (999999) are not eligible
    if (mecaId === '999999') {
      return false;
    }

    // Unassigned (0 or null) are not eligible
    if (!mecaId || mecaId === '0') {
      return false;
    }

    // Test/Special entries starting with 99 are not eligible
    if (mecaId.startsWith('99')) {
      return false;
    }

    // Check if membership is expired
    if (membershipExpiry && new Date(membershipExpiry) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Check if a format/division is eligible for points
   * Only SPL, SQL, SSI, and MK divisions are eligible
   */
  private isFormatEligible(format: string): boolean {
    const eligibleFormats = ['SPL', 'SQL', 'SSI', 'MK'];
    return eligibleFormats.includes(format.toUpperCase());
  }

  /**
   * Update points for all results in an event
   * This is the main entry point for recalculating points
   */
  async updateEventPoints(eventId: string): Promise<void> {
    const em = this.em.fork();

    // Fetch the event with its multiplier
    const event = await em.findOne(Event, { id: eventId });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const multiplier = event.pointsMultiplier || 2; // Default to 2x if not set

    // Fetch all results for this event, populated with competitor and class info
    const results = await em.find(
      CompetitionResult,
      { eventId },
      {
        populate: ['competitor'],
      }
    );

    // Get all class IDs from results
    const classIds = [...new Set(results.map(r => r.classId).filter((id): id is string => Boolean(id)))];
    const classes = await em.find(CompetitionClass, { id: { $in: classIds } });
    const classMap = new Map(classes.map(c => [c.id, c]));

    // Group results by class and format
    const groupedResults = new Map<string, CompetitionResult[]>();

    for (const result of results) {
      const competitionClass = classMap.get(result.classId || '');
      if (!competitionClass) {
        continue;
      }

      // Only include eligible formats
      if (!this.isFormatEligible(competitionClass.format)) {
        result.pointsEarned = 0;
        continue;
      }

      const key = `${competitionClass.format}-${result.competitionClass}`;
      if (!groupedResults.has(key)) {
        groupedResults.set(key, []);
      }
      groupedResults.get(key)!.push(result);
    }

    // Process each group
    for (const [key, groupResults] of groupedResults) {
      // Sort by score (descending - higher score is better)
      groupResults.sort((a, b) => b.score - a.score);

      // Assign placement and calculate points
      let currentPlacement = 1;
      for (const result of groupResults) {
        result.placement = currentPlacement;

        // Get competitor's membership info if available
        let mecaId = result.mecaId;
        let membershipExpiry: Date | undefined;

        if (result.competitor) {
          await em.populate(result, ['competitor']);
          mecaId = result.competitor.meca_id || mecaId;
          membershipExpiry = result.competitor.membership_expiry;
        }

        // Check eligibility and calculate points
        if (this.isMemberEligible(mecaId, membershipExpiry)) {
          const competitionClass = classMap.get(result.classId || '');
          if (competitionClass) {
            result.pointsEarned = this.calculatePoints(
              currentPlacement,
              multiplier,
              competitionClass.format
            );
          } else {
            result.pointsEarned = 0;
          }
        } else {
          result.pointsEarned = 0;
        }

        currentPlacement++;
      }
    }

    // Persist all changes
    await em.flush();
  }
}
