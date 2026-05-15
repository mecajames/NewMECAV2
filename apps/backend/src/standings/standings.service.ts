import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Season } from '../seasons/seasons.entity';
import { ResultTeam } from '../result-teams/result-team.entity';
import { Team } from '../teams/team.entity';
import { CompetitionFormat } from '../competition-formats/competition-formats.entity';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';

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
  teamType?: 'retailer' | 'manufacturer' | 'competitor_team';
  representativeName?: string;
}

// Team member info from memberships
export interface TeamMemberInfo {
  mecaId: string;
  memberId: string;
  teamName: string;
  teamType: 'retailer' | 'manufacturer' | 'competitor_team';
  representativeName: string;
  firstName: string;
  lastName: string;
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
   * Stable two-key comparator for standings: primary by totalPoints DESC,
   * fallback by mecaId then competitorName so ties resolve deterministically.
   * Without the fallback, em.find() returns rows in arbitrary order and the
   * rank assigned to tied competitors flips between requests.
   */
  private byPointsThenIdentity = <T extends LeaderboardEntry>(a: T, b: T) => {
    const points = b.totalPoints - a.totalPoints;
    if (points !== 0) return points;
    const idA = a.mecaId || '';
    const idB = b.mecaId || '';
    if (idA !== idB) return idA.localeCompare(idB);
    return (a.competitorName || '').localeCompare(b.competitorName || '');
  };

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
      .sort(this.byPointsThenIdentity)
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
      .sort(this.byPointsThenIdentity)
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
      .sort(this.byPointsThenIdentity)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    this.setCache(cacheKey, entries);
    return entries;
  }

  /**
   * Get team standings for a season
   * Teams come from active memberships: Retailers, Manufacturers, and Team Memberships
   */
  async getTeamStandings(
    seasonId?: string,
    limit: number = 50,
  ): Promise<TeamStandingsEntry[]> {
    const cacheKey = `team_standings_${seasonId ?? 'all'}_${limit}`;
    const cached = this.getCached<TeamStandingsEntry[]>(cacheKey);
    if (cached !== null) return cached;

    const em = this.em.fork();

    // Get all team members from memberships
    const teamMembers = await this.getTeamMembersFromMemberships(em);

    if (teamMembers.length === 0) {
      this.setCache(cacheKey, []);
      return [];
    }

    // Build MECA ID to team mapping
    const mecaIdToTeam = new Map<string, TeamMemberInfo>();
    for (const member of teamMembers) {
      if (member.mecaId && member.mecaId !== '999999' && member.mecaId !== '0') {
        mecaIdToTeam.set(member.mecaId, member);
      }
    }

    // Get competition results (optionally filtered by season)
    const resultFilter: any = {};
    if (seasonId) {
      resultFilter.season = seasonId;
    }

    const results = await em.find(CompetitionResult, resultFilter);

    // Aggregate points by team. We capture the first encountered membership
    // ID per team and expose it as `teamId` so the frontend's
    // /teams/:id link resolves to a real record. Previously this used the
    // lowercased team name, which made every leaderboard click hit
    // getPublicTeamById with a non-UUID and 404.
    const teamAggregates = new Map<string, {
      teamId: string;
      teamName: string;
      teamType: 'retailer' | 'manufacturer' | 'competitor_team';
      representativeName: string;
      totalPoints: number;
      memberMecaIds: Set<string>;
      eventIds: Set<string>;
    }>();

    for (const result of results) {
      const mecaId = result.mecaId;
      if (!mecaId || mecaId === '999999' || mecaId === '0') continue;

      const teamInfo = mecaIdToTeam.get(mecaId);
      if (!teamInfo) continue;

      const teamKey = teamInfo.teamName.toLowerCase().trim();

      if (!teamAggregates.has(teamKey)) {
        teamAggregates.set(teamKey, {
          teamId: teamInfo.memberId, // membership_id from getTeamMembersFromMemberships
          teamName: teamInfo.teamName,
          teamType: teamInfo.teamType,
          representativeName: teamInfo.representativeName,
          totalPoints: 0,
          memberMecaIds: new Set(),
          eventIds: new Set(),
        });
      }

      const agg = teamAggregates.get(teamKey)!;
      agg.totalPoints += result.pointsEarned || 0;
      agg.memberMecaIds.add(mecaId);

      const eventId = (result.event as any)?.id || result.event;
      if (eventId) agg.eventIds.add(String(eventId));
    }

    const entries: TeamStandingsEntry[] = Array.from(teamAggregates.values())
      .map(agg => ({
        teamId: agg.teamId,
        teamName: agg.teamName,
        totalPoints: agg.totalPoints,
        memberCount: agg.memberMecaIds.size,
        eventsParticipated: agg.eventIds.size,
        teamType: agg.teamType,
        representativeName: agg.representativeName,
      }))
      // Same stability concern as the competitor sort: equal point totals
      // need a tiebreaker so the same two teams don't swap rank between
      // page loads. teamName is what the user sees, so use that.
      .sort((a, b) => {
        const points = b.totalPoints - a.totalPoints;
        if (points !== 0) return points;
        return (a.teamName || '').localeCompare(b.teamName || '');
      })
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    this.setCache(cacheKey, entries);
    return entries;
  }

  /**
   * Get all team members from active memberships
   * Sources: Retailers, Manufacturers, Team Memberships, and has_team_addon competitors
   */
  private async getTeamMembersFromMemberships(em: EntityManager): Promise<TeamMemberInfo[]> {
    const teamMembers: TeamMemberInfo[] = [];

    // Query all active memberships that qualify as teams
    const memberships = await em.getConnection().execute(`
      SELECT
        m.id as membership_id,
        m.user_id,
        m.meca_id,
        m.team_name,
        m.business_name,
        m.competitor_name,
        m.has_team_addon,
        m.status,
        mtc.name as membership_type_name,
        mtc.category as membership_category,
        p.first_name,
        p.last_name,
        p.full_name,
        p.meca_id as profile_meca_id
      FROM memberships m
      JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
      LEFT JOIN profiles p ON p.id = m.user_id
      WHERE m.status = 'active'
      AND (
        mtc.category = 'retail'
        OR mtc.category = 'manufacturer'
        OR mtc.category = 'team'
        OR mtc.name LIKE '%Team%'
        OR m.has_team_addon = true
      )
    `);

    for (const m of memberships) {
      const mecaId = String(m.meca_id || m.profile_meca_id || '');
      if (!mecaId || mecaId === 'null' || mecaId === '999999' || mecaId === '0') {
        continue;
      }

      let teamName: string;
      let teamType: 'retailer' | 'manufacturer' | 'competitor_team';
      let representativeName: string;

      const firstName = m.first_name || '';
      const lastName = m.last_name || '';
      const fullName = m.full_name || `${firstName} ${lastName}`.trim();

      if (m.membership_category === 'retail') {
        // Retailer: team name is business name, representative is the person
        teamName = m.business_name || m.team_name || m.competitor_name || fullName;
        teamType = 'retailer';
        representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;
      } else if (m.membership_category === 'manufacturer') {
        // Manufacturer: team name is business name, representative is the person
        teamName = m.business_name || m.team_name || m.competitor_name || fullName;
        teamType = 'manufacturer';
        representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;
      } else {
        // Team Membership or has_team_addon: use team_name or generate placeholder
        teamType = 'competitor_team';
        representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;

        if (m.team_name && m.team_name.trim()) {
          teamName = m.team_name.trim();
        } else {
          // Generate placeholder: first_last_team_not_populated
          const safeName = `${firstName}_${lastName}`.replace(/\s+/g, '_').toLowerCase();
          teamName = `${safeName}_team_not_populated`;
        }
      }

      teamMembers.push({
        mecaId,
        memberId: m.membership_id,
        teamName,
        teamType,
        representativeName,
        firstName,
        lastName,
      });
    }

    return teamMembers;
  }

  /**
   * Get standings summary for all formats
   */
  async getFormatSummaries(seasonId?: string): Promise<FormatStandingsSummary[]> {
    const cacheKey = `format_summaries_${seasonId ?? 'all'}`;
    const cached = this.getCached<FormatStandingsSummary[]>(cacheKey);
    if (cached !== null) return cached;

    // Build from real DB data instead of a hardcoded list so summaries
    // surface every format that actually has results for this season —
    // and skip formats that have none.
    const available = await this.getFormatsWithResults(seasonId);
    const formats = available.map(f => f.format);
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
   * Get the formats that actually have results in a given season. Powers
   * the dynamic format chips so the UI never shows a format with zero
   * results (which used to happen because SSI/MK were hardcoded chips
   * but had no data in the DB).
   *
   * Returns sorted by competition_formats.display_order ASC so the panel /
   * chip order matches the admin-editable order in /admin/formats. Result
   * count is no longer the sort key — Standings, Top 10, and Leaderboard
   * all auto-select formats[0], and admins expect that default to follow
   * the order they set, not whichever format happens to have the most
   * rows this season.
   */
  async getFormatsWithResults(
    seasonId?: string,
  ): Promise<Array<{ format: string; resultCount: number }>> {
    const cacheKey = `formats_with_results_${seasonId ?? 'all'}`;
    const cached = this.getCached<Array<{ format: string; resultCount: number }>>(cacheKey);
    if (cached !== null) return cached;

    const em = this.em.fork();
    const filter: any = {};
    if (seasonId) {
      filter.season = seasonId;
    }
    const results = await em.find(CompetitionResult, filter, {
      fields: ['format'],
    });

    const counts = new Map<string, number>();
    for (const r of results) {
      const f = (r.format || '').trim();
      if (!f) continue;
      counts.set(f, (counts.get(f) || 0) + 1);
    }

    // Look up display_order for every distinct format. Unknown names fall
    // back to +Infinity so any orphan/legacy bucket sorts to the end.
    const formatRows = await em.find(CompetitionFormat, {});
    const orderByName = new Map<string, number>(
      formatRows.map(f => [f.name, f.displayOrder]),
    );

    const list = Array.from(counts.entries())
      .map(([format, resultCount]) => ({ format, resultCount }))
      .sort((a, b) => {
        const oa = orderByName.get(a.format) ?? Number.POSITIVE_INFINITY;
        const ob = orderByName.get(b.format) ?? Number.POSITIVE_INFINITY;
        return oa - ob || a.format.localeCompare(b.format);
      });

    this.setCache(cacheKey, list);
    return list;
  }

  /**
   * Get list of unique classes with results in a season.
   *
   * Sorted by (competition_formats.display_order, competition_classes.display_order,
   * className) so the order matches the admin-editable order in /admin/formats
   * and /admin/classes. Previously this sorted by result count DESC, which made
   * the byClass auto-select land on whichever class happened to be the most
   * populated this season — not the canonical "first" class admins expect.
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

    // Build (format -> displayOrder) and (format::className -> displayOrder)
    // lookups so the result list sorts the same way as the Results page.
    // Class lookup uses the lowest display_order across seasons because the
    // same class name can recur per season; using the min keeps panels stable
    // when admins update one season's classes without touching others.
    const [formatRows, classRows] = await Promise.all([
      em.find(CompetitionFormat, {}),
      em.find(CompetitionClass, {}),
    ]);
    const formatOrder = new Map<string, number>(
      formatRows.map(f => [f.name, f.displayOrder]),
    );
    const classOrder = new Map<string, number>();
    for (const c of classRows) {
      const key = `${c.format}::${c.name}`;
      const prev = classOrder.get(key);
      if (prev === undefined || c.displayOrder < prev) {
        classOrder.set(key, c.displayOrder);
      }
    }

    return Array.from(classMap.values())
      .sort((a, b) => {
        const fa = formatOrder.get(a.format) ?? Number.POSITIVE_INFINITY;
        const fb = formatOrder.get(b.format) ?? Number.POSITIVE_INFINITY;
        if (fa !== fb) return fa - fb;
        const ca = classOrder.get(`${a.format}::${a.className}`) ?? Number.POSITIVE_INFINITY;
        const cb = classOrder.get(`${b.format}::${b.className}`) ?? Number.POSITIVE_INFINITY;
        if (ca !== cb) return ca - cb;
        return a.className.localeCompare(b.className);
      })
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

      // Warm format-specific caches for whatever formats actually have
      // data this season — keeps the hardcoded list from going stale.
      const available = await this.getFormatsWithResults(currentSeasonId);
      for (const { format } of available) {
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
    // Track unique event IDs per competitor so we count events, not result
    // rows. Previously this incremented by 1 per row, which inflated the
    // count by ~5–10x for any competitor entering multiple classes at the
    // same event (e.g. 31 rows / 4 events became "31 events" in the UI).
    const eventIdsByKey = new Map<string, Set<string>>();

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
        eventIdsByKey.set(aggregationKey, new Set());
      }

      const entry = aggregated.get(aggregationKey)!;
      entry.totalPoints += result.pointsEarned || 0;

      const eventId = (result.event as any)?.id || result.event;
      if (eventId) eventIdsByKey.get(aggregationKey)!.add(String(eventId));

      if (result.placement === 1) entry.firstPlace++;
      if (result.placement === 2) entry.secondPlace++;
      if (result.placement === 3) entry.thirdPlace++;
    }

    // Roll up the dedup'd event sets into the final count.
    for (const [key, entry] of aggregated) {
      entry.eventsParticipated = eventIdsByKey.get(key)?.size ?? 0;
    }

    return aggregated;
  }

  private aggregateByMecaIdWithClass(
    results: CompetitionResult[],
    format: string,
    competitionClass: string,
  ): Map<string, ClassStandingsEntry> {
    const aggregated = new Map<string, ClassStandingsEntry>();
    const eventIdsByKey = new Map<string, Set<string>>();

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
        eventIdsByKey.set(aggregationKey, new Set());
      }

      const entry = aggregated.get(aggregationKey)!;
      entry.totalPoints += result.pointsEarned || 0;

      const eventId = (result.event as any)?.id || result.event;
      if (eventId) eventIdsByKey.get(aggregationKey)!.add(String(eventId));

      if (result.placement === 1) entry.firstPlace++;
      if (result.placement === 2) entry.secondPlace++;
      if (result.placement === 3) entry.thirdPlace++;
    }

    for (const [key, entry] of aggregated) {
      entry.eventsParticipated = eventIdsByKey.get(key)?.size ?? 0;
    }

    return aggregated;
  }
}
