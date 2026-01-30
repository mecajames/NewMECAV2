import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Season } from '../seasons/seasons.entity';
import { ResultTeam } from '../result-teams/result-team.entity';
import { Team } from '../teams/team.entity';

// Leaderboard entry interface
export interface LeaderboardEntry {
  mecaId: string | null;
  competitorName: string;
  competitorId: string | null;
  totalPoints: number;
  eventsParticipated: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  isGuest: boolean;
  rank?: number;
}

// Class standings entry
export interface ClassStandingsEntry extends LeaderboardEntry {
  competitionClass: string;
  format: string;
}

// Team standings entry
export interface TeamStandingsEntry {
  teamId: string;
  teamName: string;
  totalPoints: number;
  memberCount: number;
  eventsParticipated: number;
  rank?: number;
}

// Format standings summary
export interface FormatStandingsSummary {
  format: string;
  totalCompetitors: number;
  totalEvents: number;
  topCompetitors: LeaderboardEntry[];
}

@Injectable()
export class StandingsService {
  private readonly logger = new Logger(StandingsService.name);

  // Cache for standings to avoid repeated expensive calculations
  private standingsCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Get overall season leaderboard with pagination
   */
  async getSeasonLeaderboard(
    seasonId?: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const cacheKey = `season_leaderboard_${seasonId ?? 'all'}_${limit}_${offset}`;
    const cached = this.getCached<{ entries: LeaderboardEntry[]; total: number }>(cacheKey);
    if (cached !== null) return cached;

    const em = this.em.fork();

    // Only filter by season if explicitly provided (not empty string)
    const filter: any = {};
    if (seasonId) {
      filter.season = seasonId;
    }

    const results = await em.find(CompetitionResult, filter, {
      populate: ['competitor'],
    });

    const aggregated = this.aggregateByMecaId(results);
    const sortedEntries = Array.from(aggregated.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const total = sortedEntries.length;
    const entries = sortedEntries.slice(offset, offset + limit);

    const result = { entries, total };
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get standings by format (SPL, SQL, SSI, MK)
   */
  async getStandingsByFormat(
    format: string,
    seasonId?: string,
    limit: number = 50,
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `format_standings_${format}_${seasonId ?? 'all'}_${limit}`;
    const cached = this.getCached<LeaderboardEntry[]>(cacheKey);
    if (cached !== null) return cached;

    const em = this.em.fork();

    // Only filter by season if explicitly provided (not empty string)
    const filter: any = { format: format.toUpperCase() };
    if (seasonId) {
      filter.season = seasonId;
    }

    const results = await em.find(CompetitionResult, filter, {
      populate: ['competitor'],
    });

    const aggregated = this.aggregateByMecaId(results);
    const entries = Array.from(aggregated.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    this.setCache(cacheKey, entries);
    return entries;
  }

  /**
   * Get standings by competition class within a format
   */
  async getStandingsByClass(
    format: string,
    competitionClass: string,
    seasonId?: string,
    limit: number = 50,
  ): Promise<ClassStandingsEntry[]> {
    const cacheKey = `class_standings_${format}_${competitionClass}_${seasonId ?? 'all'}_${limit}`;
    const cached = this.getCached<ClassStandingsEntry[]>(cacheKey);
    if (cached !== null) return cached;

    const em = this.em.fork();

    // Only filter by season if explicitly provided (not empty string)
    const filter: any = {
      format: format.toUpperCase(),
      competitionClass: competitionClass,
    };
    if (seasonId) {
      filter.season = seasonId;
    }

    const results = await em.find(CompetitionResult, filter, {
      populate: ['competitor'],
    });

    const aggregated = this.aggregateByMecaIdWithClass(results, format, competitionClass);
    const entries = Array.from(aggregated.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    this.setCache(cacheKey, entries);
    return entries;
  }

  /**
   * Get team standings for a season
   */
  async getTeamStandings(
    seasonId?: string,
    limit: number = 50,
  ): Promise<TeamStandingsEntry[]> {
    const cacheKey = `team_standings_${seasonId ?? 'all'}_${limit}`;
    const cached = this.getCached<TeamStandingsEntry[]>(cacheKey);
    if (cached !== null) return cached;

    const em = this.em.fork();

    // Only filter by season if explicitly provided (not empty string)
    const filter: any = {};
    if (seasonId) {
      filter.result = { season: seasonId };
    }

    const resultTeams = await em.find(ResultTeam, filter, {
      populate: ['team', 'result'],
    });

    // Aggregate by team
    const teamAggregates = new Map<string, {
      teamId: string;
      teamName: string;
      totalPoints: number;
      memberMecaIds: Set<string>;
      eventIds: Set<string>;
    }>();

    for (const rt of resultTeams) {
      const teamId = (rt.team as any)?.id || rt.team;
      const teamObj = rt.team as Team;
      if (!teamId) continue;

      if (!teamAggregates.has(teamId)) {
        teamAggregates.set(teamId, {
          teamId,
          teamName: teamObj?.name || 'Unknown Team',
          totalPoints: 0,
          memberMecaIds: new Set(),
          eventIds: new Set(),
        });
      }

      const agg = teamAggregates.get(teamId)!;
      // Points come from the linked CompetitionResult
      agg.totalPoints += rt.result?.pointsEarned || 0;
      if (rt.result?.mecaId) {
        agg.memberMecaIds.add(rt.result.mecaId);
      }
      if (rt.result?.event) {
        const eventId = (rt.result.event as any)?.id || rt.result.event;
        if (eventId) agg.eventIds.add(eventId);
      }
    }

    const entries: TeamStandingsEntry[] = Array.from(teamAggregates.values())
      .map(agg => ({
        teamId: agg.teamId,
        teamName: agg.teamName,
        totalPoints: agg.totalPoints,
        memberCount: agg.memberMecaIds.size,
        eventsParticipated: agg.eventIds.size,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    this.setCache(cacheKey, entries);
    return entries;
  }

  /**
   * Get standings summary for all formats
   */
  async getFormatSummaries(seasonId?: string): Promise<FormatStandingsSummary[]> {
    const cacheKey = `format_summaries_${seasonId ?? 'all'}`;
    const cached = this.getCached<FormatStandingsSummary[]>(cacheKey);
    if (cached !== null) return cached;

    const formats = ['SPL', 'SQL', 'SSI', 'MK'];
    const summaries: FormatStandingsSummary[] = [];

    for (const format of formats) {
      const standings = await this.getStandingsByFormat(format, seasonId, 10);

      // Get unique events and competitors for this format
      const em = this.em.fork();

      // Only filter by season if explicitly provided (not empty string)
      const filter: any = { format };
      if (seasonId) {
        filter.season = seasonId;
      }

      const results = await em.find(CompetitionResult, filter);
      const uniqueCompetitors = new Set(results.map(r => r.mecaId || r.competitorName));
      const uniqueEvents = new Set(results.map(r => (r.event as any)?.id || r.event).filter(Boolean));

      summaries.push({
        format,
        totalCompetitors: uniqueCompetitors.size,
        totalEvents: uniqueEvents.size,
        topCompetitors: standings,
      });
    }

    this.setCache(cacheKey, summaries);
    return summaries;
  }

  /**
   * Get competitor's season statistics
   */
  async getCompetitorStats(
    mecaId: string,
    seasonId?: string,
  ): Promise<{
    mecaId: string;
    totalPoints: number;
    ranking: number;
    eventsParticipated: number;
    placements: { first: number; second: number; third: number };
    byFormat: Array<{ format: string; points: number; events: number }>;
    byClass: Array<{ format: string; className: string; points: number; events: number }>;
  } | null> {
    const em = this.em.fork();

    // Only filter by season if explicitly provided (not empty string)
    const filter: any = { mecaId };
    if (seasonId) {
      filter.season = seasonId;
    }

    const results = await em.find(CompetitionResult, filter);
    if (results.length === 0) {
      return null;
    }

    // Calculate totals
    let totalPoints = 0;
    let firstPlace = 0;
    let secondPlace = 0;
    let thirdPlace = 0;
    const eventIds = new Set<string>();
    const byFormat = new Map<string, { points: number; events: Set<string> }>();
    const byClass = new Map<string, { format: string; className: string; points: number; events: Set<string> }>();

    for (const result of results) {
      totalPoints += result.pointsEarned || 0;

      if (result.placement === 1) firstPlace++;
      if (result.placement === 2) secondPlace++;
      if (result.placement === 3) thirdPlace++;

      const eventId = (result.event as any)?.id || result.event;
      if (eventId) eventIds.add(eventId);

      const format = result.format || 'Unknown';
      if (!byFormat.has(format)) {
        byFormat.set(format, { points: 0, events: new Set() });
      }
      byFormat.get(format)!.points += result.pointsEarned || 0;
      if (eventId) byFormat.get(format)!.events.add(eventId);

      const classKey = `${format}:${result.competitionClass}`;
      if (!byClass.has(classKey)) {
        byClass.set(classKey, {
          format,
          className: result.competitionClass || 'Unknown',
          points: 0,
          events: new Set(),
        });
      }
      byClass.get(classKey)!.points += result.pointsEarned || 0;
      if (eventId) byClass.get(classKey)!.events.add(eventId);
    }

    // Get ranking
    const { entries } = await this.getSeasonLeaderboard(seasonId, 10000, 0);
    const ranking = entries.findIndex(e => e.mecaId === mecaId) + 1;

    return {
      mecaId,
      totalPoints,
      ranking: ranking || entries.length + 1,
      eventsParticipated: eventIds.size,
      placements: { first: firstPlace, second: secondPlace, third: thirdPlace },
      byFormat: Array.from(byFormat.entries()).map(([format, data]) => ({
        format,
        points: data.points,
        events: data.events.size,
      })),
      byClass: Array.from(byClass.values()).map(data => ({
        format: data.format,
        className: data.className,
        points: data.points,
        events: data.events.size,
      })),
    };
  }

  /**
   * Get list of unique classes with results in a season
   */
  async getClassesWithResults(
    format?: string,
    seasonId?: string,
  ): Promise<Array<{ format: string; className: string; resultCount: number }>> {
    const em = this.em.fork();

    // Only filter by season if explicitly provided (not empty string)
    const filter: any = {};
    if (format) {
      filter.format = format.toUpperCase();
    }
    if (seasonId) {
      filter.season = seasonId;
    }

    const results = await em.find(CompetitionResult, filter);

    const classMap = new Map<string, { format: string; className: string; count: number }>();

    for (const result of results) {
      const key = `${result.format}:${result.competitionClass}`;
      if (!classMap.has(key)) {
        classMap.set(key, {
          format: result.format || 'Unknown',
          className: result.competitionClass || 'Unknown',
          count: 0,
        });
      }
      classMap.get(key)!.count++;
    }

    return Array.from(classMap.values())
      .sort((a, b) => b.count - a.count)
      .map(({ format, className, count }) => ({
        format,
        className,
        resultCount: count,
      }));
  }

  /**
   * Scheduled job to warm the cache every 5 minutes
   * This ensures commonly accessed standings are pre-computed
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async warmStandingsCache(): Promise<void> {
    this.logger.log('Warming standings cache...');

    try {
      // Get current season
      const currentSeasonId = await this.getCurrentSeasonId();
      if (!currentSeasonId) {
        this.logger.log('No current season found, skipping cache warm');
        return;
      }

      // Warm the main caches
      await this.getSeasonLeaderboard(currentSeasonId, 100, 0);
      await this.getFormatSummaries(currentSeasonId);
      await this.getTeamStandings(currentSeasonId, 50);

      // Warm format-specific caches
      for (const format of ['SPL', 'SQL', 'SSI', 'MK']) {
        await this.getStandingsByFormat(format, currentSeasonId, 50);
      }

      this.logger.log('Standings cache warmed successfully');
    } catch (error) {
      this.logger.error('Failed to warm standings cache:', error);
    }
  }

  /**
   * Clear all standings caches (useful after bulk result imports)
   */
  clearCache(): void {
    this.standingsCache.clear();
    this.logger.log('Standings cache cleared');
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async getCurrentSeasonId(): Promise<string | null> {
    const em = this.em.fork();
    const currentSeason = await em.findOne(Season, { isCurrent: true });
    return currentSeason?.id || null;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.standingsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.standingsCache.set(key, { data, timestamp: Date.now() });
  }

  private aggregateByMecaId(results: CompetitionResult[]): Map<string, LeaderboardEntry> {
    const aggregated = new Map<string, LeaderboardEntry>();

    for (const result of results) {
      const mecaId = result.mecaId;
      const isGuest = !mecaId || mecaId === '999999' || mecaId === '0';
      const aggregationKey = isGuest ? `guest_${result.competitorName}` : `meca_${mecaId}`;

      if (!aggregated.has(aggregationKey)) {
        aggregated.set(aggregationKey, {
          mecaId: isGuest ? null : mecaId,
          competitorName: result.competitorName,
          competitorId: result.competitor?.id || null,
          totalPoints: 0,
          eventsParticipated: 0,
          firstPlace: 0,
          secondPlace: 0,
          thirdPlace: 0,
          isGuest,
        });
      }

      const entry = aggregated.get(aggregationKey)!;
      entry.totalPoints += result.pointsEarned || 0;
      entry.eventsParticipated += 1;

      if (result.placement === 1) entry.firstPlace++;
      if (result.placement === 2) entry.secondPlace++;
      if (result.placement === 3) entry.thirdPlace++;
    }

    return aggregated;
  }

  private aggregateByMecaIdWithClass(
    results: CompetitionResult[],
    format: string,
    competitionClass: string,
  ): Map<string, ClassStandingsEntry> {
    const aggregated = new Map<string, ClassStandingsEntry>();

    for (const result of results) {
      const mecaId = result.mecaId;
      const isGuest = !mecaId || mecaId === '999999' || mecaId === '0';
      const aggregationKey = isGuest ? `guest_${result.competitorName}` : `meca_${mecaId}`;

      if (!aggregated.has(aggregationKey)) {
        aggregated.set(aggregationKey, {
          mecaId: isGuest ? null : mecaId,
          competitorName: result.competitorName,
          competitorId: result.competitor?.id || null,
          totalPoints: 0,
          eventsParticipated: 0,
          firstPlace: 0,
          secondPlace: 0,
          thirdPlace: 0,
          isGuest,
          competitionClass,
          format,
        });
      }

      const entry = aggregated.get(aggregationKey)!;
      entry.totalPoints += result.pointsEarned || 0;
      entry.eventsParticipated += 1;

      if (result.placement === 1) entry.firstPlace++;
      if (result.placement === 2) entry.secondPlace++;
      if (result.placement === 3) entry.thirdPlace++;
    }

    return aggregated;
  }
}
