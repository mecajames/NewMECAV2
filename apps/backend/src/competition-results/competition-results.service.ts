import { Injectable, Inject, NotFoundException, Optional, Logger } from '@nestjs/common';
import { EntityManager, Reference, wrap } from '@mikro-orm/core';
import { MembershipStatus, MembershipCategory, PaymentStatus } from '@newmeca/shared';
import { CompetitionResult } from './competition-results.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';
import { ClassNameMapping } from '../class-name-mappings/class-name-mappings.entity';
import { Season } from '../seasons/seasons.entity';
import { AuditService } from '../audit/audit.service';
import { Membership } from '../memberships/memberships.entity';
import { WorldFinalsService } from '../world-finals/world-finals.service';
import { AchievementsService } from '../achievements/achievements.service';
import { PointsConfigurationService } from '../points-configuration/points-configuration.service';
import { PointsConfiguration } from '../points-configuration/points-configuration.entity';

@Injectable()
export class CompetitionResultsService {
  private currentSessionId: string | null = null;
  private manualEntryResults: any[] = [];

  // Cache for points-eligible MECA IDs to avoid repeated DB queries
  private pointsEligibleMecaIds: Set<number> = new Set();
  private pointsEligibleCacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private readonly logger = new Logger(CompetitionResultsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly auditService: AuditService,
    private readonly pointsConfigService: PointsConfigurationService,
    @Optional() private readonly worldFinalsService?: WorldFinalsService,
    @Optional() private readonly achievementsService?: AchievementsService,
  ) {}

  /**
   * Start a manual entry session
   */
  async startManualSession(eventId: string, userId: string, format?: string): Promise<string> {
    const session = await this.auditService.createSession({
      eventId,
      userId,
      entryMethod: 'manual',
      format,
    });
    this.currentSessionId = session.id;
    this.manualEntryResults = [];
    return session.id;
  }

  /**
   * End a manual entry session and generate Excel file
   */
  async endManualSession(): Promise<void> {
    if (!this.currentSessionId) {
      return;
    }

    // Generate Excel file for manual entries if there are any results
    if (this.manualEntryResults.length > 0) {
      const sessionData = await this.auditService.getEventSessions('');
      const session = sessionData.find(s => s.id === this.currentSessionId);

      if (session) {
        await this.auditService.generateManualEntriesExcel(
          session.eventId,
          this.currentSessionId,
          this.manualEntryResults
        );
      }
    }

    // End the session with final result count
    await this.auditService.endSession(this.currentSessionId, this.manualEntryResults.length);
    this.currentSessionId = null;
    this.manualEntryResults = [];
  }

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
    return em.find(CompetitionResult, { event: eventId }, {
      orderBy: { placement: 'ASC' },
      populate: ['competitor'],
    });
  }

  /**
   * Get result counts for all events in a single efficient query
   * Returns a map of eventId -> count
   */
  async getResultCountsByEvent(): Promise<Record<string, number>> {
    const em = this.em.fork();

    // Use raw query for efficient GROUP BY count
    const results = await em.getConnection().execute(
      `SELECT event_id, COUNT(*) as count FROM competition_results GROUP BY event_id`
    );

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.event_id] = parseInt(row.count, 10);
    }

    return counts;
  }

  async findByCompetitor(competitorId: string): Promise<CompetitionResult[]> {
    const em = this.em.fork();
    return em.find(CompetitionResult, { competitor: competitorId });
  }

  async findByMecaId(mecaId: string): Promise<any[]> {
    const em = this.em.fork();
    const results = await em.find(CompetitionResult, { mecaId }, {
      orderBy: { createdAt: 'DESC' },
      populate: ['event'],
    });

    // Use wrap().toObject() for proper serialization, then add event data
    // since event has hidden: true in the entity
    return results.map(result => {
      const serialized = wrap(result).toObject() as any;
      // Manually add event since it's hidden in the entity
      if (result.event) {
        serialized.event = {
          id: result.event.id,
          name: result.event.title,
          title: result.event.title,
          event_date: result.event.eventDate,
          venue_name: result.event.venueName,
          venue_address: result.event.venueAddress,
          venue_city: result.event.venueCity,
          venue_state: result.event.venueState,
        };
      }
      return serialized;
    });
  }

  async create(data: Partial<CompetitionResult>, userId?: string): Promise<CompetitionResult> {
    const em = this.em.fork();

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = { ...data };

    // Capture event_id for points recalculation
    const eventId = (data as any).event_id;

    // Auto-populate season_id from event if not provided
    if (eventId && !(data as any).season_id) {
      const event = await em.findOne(Event, { id: eventId }, { populate: ['season'] });
      if (event?.season) {
        (data as any).season_id = event.season.id;
      }
    }

    // Handle event_id by creating a Reference
    if ((data as any).event_id !== undefined) {
      transformedData.event = Reference.createFromPK(Event, (data as any).event_id);
      delete transformedData.event_id;
    }

    // Handle competitor_id by creating a Reference (only if not null)
    if ((data as any).competitor_id !== undefined && (data as any).competitor_id !== null) {
      transformedData.competitor = Reference.createFromPK(Profile, (data as any).competitor_id);
      delete transformedData.competitor_id;
    } else if ((data as any).competitor_id === null) {
      // Explicitly set to undefined to avoid Reference creation
      transformedData.competitor = undefined;
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
    if ((data as any).format !== undefined) {
      transformedData.format = (data as any).format;
    }
    if ((data as any).class_id !== undefined) {
      if ((data as any).class_id) {
        transformedData.competitionClassEntity = Reference.createFromPK(CompetitionClass, (data as any).class_id);
      }
      delete transformedData.class_id;
      delete transformedData.classId;
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
      if ((data as any).season_id) {
        transformedData.season = Reference.createFromPK(Season, (data as any).season_id);
      }
      delete transformedData.season_id;
      delete transformedData.seasonId;
    }
    if ((data as any).created_by !== undefined) {
      if ((data as any).created_by) {
        transformedData.creator = Reference.createFromPK(Profile, (data as any).created_by);
      }
      delete transformedData.created_by;
      delete transformedData.createdBy;
    }

    const result = em.create(CompetitionResult, transformedData);
    await em.persistAndFlush(result);

    // Automatically recalculate points for all results in this event
    if (eventId) {
      await this.updateEventPoints(eventId);

      // Reload the result to get updated points
      await em.refresh(result);
    }

    // Log to audit if userId is provided
    if (userId) {
      let sessionId = this.currentSessionId;
      let createdManualSession = false;

      // If no active session, create a manual entry session
      if (!sessionId && eventId) {
        const session = await this.auditService.createSession({
          eventId,
          userId,
          entryMethod: 'manual',
          format: transformedData.format || (data as any).format,
        });
        sessionId = session.id;
        createdManualSession = true;
      }

      await this.auditService.logAction({
        sessionId: sessionId ?? undefined,
        resultId: result.id,
        action: 'create',
        newData: JSON.parse(JSON.stringify(result)),
        userId,
      });

      // End the manual session immediately (single entry)
      if (createdManualSession && sessionId) {
        await this.auditService.endSession(sessionId, 1);
      }

      // Track manual entries for Excel generation if there's an active batch session
      if (this.currentSessionId) {
        this.manualEntryResults.push(result);
      }
    }

    return result;
  }

  async update(id: string, data: Partial<CompetitionResult>, userId?: string, ipAddress?: string): Promise<CompetitionResult> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id }, { populate: ['event'] });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }

    // Capture event_id for points recalculation and audit
    const eventIdFromEvent = result.event?.id;
    const eventId = (data as any).event_id || eventIdFromEvent;

    // Capture old data for audit log BEFORE modifications
    // Use wrap().toObject() for proper serialization of MikroORM entity
    const serializedResult = wrap(result).toObject();
    const oldData = {
      id: result.id,
      competitorName: result.competitorName,
      competitionClass: result.competitionClass,
      format: result.format,
      score: result.score,
      placement: result.placement,
      pointsEarned: result.pointsEarned,
      vehicleInfo: result.vehicleInfo,
      wattage: result.wattage,
      frequency: result.frequency,
      notes: result.notes,
      mecaId: result.mecaId,
      classId: result.classId,
      seasonId: result.seasonId,
      createdBy: result.createdBy,
      updatedBy: result.updatedBy,
      revisionCount: result.revisionCount,
      event_id: eventIdFromEvent,
      eventId: eventIdFromEvent,
    };

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = { ...data };

    // Handle event_id by creating a Reference
    if ((data as any).event_id !== undefined) {
      transformedData.event = Reference.createFromPK(Event, (data as any).event_id);
      delete transformedData.event_id;
    }

    // Handle competitor_id by creating a Reference (only if not null)
    if ((data as any).competitor_id !== undefined && (data as any).competitor_id !== null) {
      transformedData.competitor = Reference.createFromPK(Profile, (data as any).competitor_id);
      delete transformedData.competitor_id;
    } else if ((data as any).competitor_id === null) {
      // Explicitly set to undefined to avoid Reference creation
      transformedData.competitor = undefined;
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
    if ((data as any).format !== undefined) {
      transformedData.format = (data as any).format;
    }
    if ((data as any).class_id !== undefined) {
      if ((data as any).class_id) {
        transformedData.competitionClassEntity = Reference.createFromPK(CompetitionClass, (data as any).class_id);
      }
      delete transformedData.class_id;
      delete transformedData.classId;
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
      if ((data as any).season_id) {
        transformedData.season = Reference.createFromPK(Season, (data as any).season_id);
      }
      delete transformedData.season_id;
      delete transformedData.seasonId;
    }

    // Track audit trail for updates
    if ((data as any).updated_by !== undefined) {
      if ((data as any).updated_by) {
        transformedData.updater = Reference.createFromPK(Profile, (data as any).updated_by);
      }
      delete transformedData.updated_by;
      delete transformedData.updatedBy;
    }

    if ((data as any).modification_reason !== undefined) {
      transformedData.modificationReason = (data as any).modification_reason;
      delete transformedData.modification_reason;
    }

    // Increment revision count on every update
    transformedData.revisionCount = (result.revisionCount || 0) + 1;

    // updatedAt will be automatically set by MikroORM's onUpdate decorator

    em.assign(result, transformedData);
    await em.flush();

    // Automatically recalculate points for all results in this event
    if (eventId) {
      await this.updateEventPoints(eventId);

      // Reload the result to get updated points
      await em.refresh(result);
    }

    // Log to audit if userId is provided
    console.log(`[AUDIT] Update called - userId: ${userId}, resultId: ${id}`);
    if (userId) {
      // Capture new data AFTER modifications with explicit fields
      const newData = {
        id: result.id,
        competitorName: result.competitorName,
        competitionClass: result.competitionClass,
        format: result.format,
        score: result.score,
        placement: result.placement,
        pointsEarned: result.pointsEarned,
        vehicleInfo: result.vehicleInfo,
        wattage: result.wattage,
        frequency: result.frequency,
        notes: result.notes,
        mecaId: result.mecaId,
        classId: result.classId,
        seasonId: result.seasonId,
        createdBy: result.createdBy,
        updatedBy: result.updatedBy,
        revisionCount: result.revisionCount,
        event_id: eventId,
        eventId: eventId,
      };
      console.log(`[AUDIT] Logging update action for result ${id}`);
      console.log(`[AUDIT] oldData:`, JSON.stringify(oldData));
      console.log(`[AUDIT] newData:`, JSON.stringify(newData));
      await this.auditService.logAction({
        sessionId: this.currentSessionId ?? undefined,
        resultId: result.id,
        action: 'update',
        oldData,
        newData,
        userId,
        ipAddress,
      });
    } else {
      console.log(`[AUDIT] Skipping audit log - no userId provided`);
    }

    return result;
  }

  async delete(id: string, userId?: string, ipAddress?: string, reason?: string): Promise<void> {
    const em = this.em.fork();

    // Populate event relation to ensure we have eventId for audit log
    const result = await em.findOne(CompetitionResult, { id }, { populate: ['event'] });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }

    // Capture old data for audit log before deletion with explicit fields
    // Do NOT spread ...result as it includes MikroORM proxy data
    const eventId = result.event?.id;
    const oldData = {
      id: result.id,
      competitorName: result.competitorName,
      competitionClass: result.competitionClass,
      format: result.format,
      score: result.score,
      placement: result.placement,
      pointsEarned: result.pointsEarned,
      vehicleInfo: result.vehicleInfo,
      wattage: result.wattage,
      frequency: result.frequency,
      notes: result.notes,
      mecaId: result.mecaId,
      classId: result.classId,
      seasonId: result.seasonId,
      createdBy: result.createdBy,
      updatedBy: result.updatedBy,
      revisionCount: result.revisionCount,
      event_id: eventId,
      eventId: eventId,
    };

    await em.removeAndFlush(result);

    // Log to audit if userId is provided
    if (userId) {
      await this.auditService.logAction({
        sessionId: this.currentSessionId ?? undefined,
        resultId: id,
        action: 'delete',
        oldData,
        newData: reason ? { deletion_reason: reason } : null,
        userId,
        ipAddress,
      });
    }
  }

  async getLeaderboard(seasonId?: string): Promise<any[]> {
    const em = this.em.fork();

    // Build the query filter
    const filter: any = {};
    let effectiveSeasonId = seasonId;

    if (seasonId) {
      filter.season = seasonId;
    } else {
      // Get current season for qualification status
      const currentSeason = await em.findOne(Season, { isCurrent: true });
      if (currentSeason) {
        effectiveSeasonId = currentSeason.id;
      }
    }

    // Fetch all results with the filter
    const results = await em.find(CompetitionResult, filter, {
      populate: ['competitor']
    });

    // Aggregate results by MECA ID (per-membership, not per-user)
    // This allows users with multiple memberships to have separate leaderboard entries
    const aggregated = new Map<string, any>();

    for (const result of results) {
      // Use MECA ID as the primary key for aggregation
      // Fall back to competitor name for guests (999999) to group by name
      const mecaId = result.mecaId;
      const isGuest = !mecaId || mecaId === '999999' || mecaId === '0';
      const aggregationKey = isGuest ? `guest_${result.competitorName}` : `meca_${mecaId}`;

      if (!aggregated.has(aggregationKey)) {
        aggregated.set(aggregationKey, {
          competitor_id: result.competitor?.id || '',
          competitor_name: result.competitorName,
          total_points: 0,
          events_participated: 0,
          first_place: 0,
          second_place: 0,
          third_place: 0,
          meca_id: isGuest ? null : mecaId,
          is_guest: isGuest,
          is_qualified: false, // Will be updated below
        });
      }

      const entry = aggregated.get(aggregationKey);
      entry.total_points += result.pointsEarned || 0;
      entry.events_participated += 1;

      if (result.placement === 1) entry.first_place += 1;
      if (result.placement === 2) entry.second_place += 1;
      if (result.placement === 3) entry.third_place += 1;
    }

    // Get qualification statuses for all MECA IDs
    if (effectiveSeasonId && this.worldFinalsService) {
      const mecaIds = Array.from(aggregated.values())
        .filter(e => e.meca_id)
        .map(e => parseInt(e.meca_id, 10))
        .filter(id => !isNaN(id));

      if (mecaIds.length > 0) {
        const qualificationStatuses = await this.worldFinalsService.getQualificationStatuses(
          mecaIds,
          effectiveSeasonId
        );

        // Update entries with qualification status
        for (const entry of aggregated.values()) {
          if (entry.meca_id) {
            const mecaIdNum = parseInt(entry.meca_id, 10);
            if (!isNaN(mecaIdNum)) {
              entry.is_qualified = qualificationStatuses.get(mecaIdNum) || false;
            }
          }
        }
      }
    }

    // Convert to array and sort by total points descending
    // Guests (no points) will naturally be at the bottom
    return Array.from(aggregated.values())
      .sort((a, b) => b.total_points - a.total_points);
  }

  /**
   * Calculate points for a single result based on placement and event multiplier
   * Uses the configurable points system from the database
   *
   * Standard Events (1X, 2X, 3X): Base points × multiplier (only top 5)
   * 4X Events: Special fixed points per placement (configurable)
   * Extended 4X: Optional participation points for placements 6th-50th (when enabled)
   *
   * @param placement - The competitor's placement (1st, 2nd, etc.)
   * @param multiplier - The event's points multiplier (0, 1, 2, 3, or 4)
   * @param format - The competition format (e.g., 'SPL', 'SQL')
   * @param config - The points configuration for the season
   * @returns The calculated points
   */
  private calculatePoints(placement: number, multiplier: number, format: string, config: PointsConfiguration): number {
    // Delegate to the PointsConfigurationService for consistent calculation
    return this.pointsConfigService.calculatePoints(placement, multiplier, config);
  }

  /**
   * Refresh the cache of points-eligible MECA IDs from the memberships table.
   * Only Competitor, Retailer, and Manufacturer memberships with active paid status are eligible.
   */
  private async refreshPointsEligibleCache(): Promise<void> {
    const now = Date.now();
    if (now - this.pointsEligibleCacheTimestamp < this.CACHE_TTL_MS) {
      return; // Cache is still valid
    }

    const em = this.em.fork();
    const today = new Date();

    // Points-eligible categories
    const pointsEligibleCategories = [
      MembershipCategory.COMPETITOR,
      MembershipCategory.RETAIL,
      MembershipCategory.MANUFACTURER,
    ];

    // Find all active, paid memberships with MECA IDs in eligible categories
    const memberships = await em.find(
      Membership,
      {
        mecaId: { $ne: null },
        paymentStatus: PaymentStatus.PAID,
        membershipTypeConfig: { category: { $in: pointsEligibleCategories } },
        $or: [{ endDate: null }, { endDate: { $gt: today } }],
      },
      {
        populate: ['membershipTypeConfig'],
      }
    );

    // Update the cache
    this.pointsEligibleMecaIds = new Set(memberships.map(m => m.mecaId!));
    this.pointsEligibleCacheTimestamp = now;
  }

  /**
   * Check if a MECA ID is eligible for points.
   *
   * Points eligibility rules:
   * 1. MECA ID must be assigned (not null, 0, or 999999)
   * 2. MECA ID must belong to an active, paid Competitor, Retailer, or Manufacturer membership
   * 3. Membership must not be expired
   * 4. Test/Special entries (IDs starting with 99) are not eligible
   */
  private async isMemberEligibleAsync(mecaId: string | undefined): Promise<boolean> {
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

    // Parse MECA ID as number
    const mecaIdNum = parseInt(mecaId, 10);
    if (isNaN(mecaIdNum)) {
      return false;
    }

    // Refresh cache if needed
    await this.refreshPointsEligibleCache();

    // Check if this MECA ID is in our points-eligible set
    return this.pointsEligibleMecaIds.has(mecaIdNum);
  }

  /**
   * Check if a member is eligible for points (synchronous version for backward compatibility).
   * This version does basic validation but doesn't check membership database.
   * Use isMemberEligibleAsync for full eligibility checking.
   *
   * @deprecated Use isMemberEligibleAsync for full membership-based eligibility checking
   */
  private isMemberEligible(
    mecaId: string | undefined,
    membershipExpiry: Date | undefined,
    membershipStatus?: string
  ): boolean {
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

    // Check membership status if provided
    if (membershipStatus && membershipStatus !== MembershipStatus.ACTIVE) {
      return false;
    }

    // Check if membership is expired (if expiry date exists)
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

    // Fetch the event with its multiplier and season (for qualification checks)
    const event = await em.findOne(Event, { id: eventId }, { populate: ['season'] });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const multiplier = event.pointsMultiplier || 2; // Default to 2x if not set

    // Fetch the points configuration for this event's season
    let pointsConfig: PointsConfiguration | null = null;
    if (event.season?.id) {
      pointsConfig = await this.pointsConfigService.getConfigForSeason(event.season.id);
    } else {
      // Fall back to current season config if event has no season
      pointsConfig = await this.pointsConfigService.getConfigForCurrentSeason();
    }

    // If still no config, log warning and use hardcoded defaults
    if (!pointsConfig) {
      this.logger.warn(`No points configuration found for event ${eventId}, using hardcoded defaults`);
    }

    // Fetch all results for this event, populated with competitor and class info
    const results = await em.find(
      CompetitionResult,
      { event: eventId },
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
      // Get format from class if available, otherwise from result.format field
      let format = result.format;
      const competitionClass = classMap.get(result.classId || '');
      if (competitionClass) {
        format = competitionClass.format;
      }

      // Skip if no format found
      if (!format) {
        result.pointsEarned = 0;
        continue;
      }

      // Only include eligible formats
      if (!this.isFormatEligible(format)) {
        result.pointsEarned = 0;
        continue;
      }

      const key = `${format}-${result.competitionClass}`;
      if (!groupedResults.has(key)) {
        groupedResults.set(key, []);
      }
      groupedResults.get(key)!.push(result);
    }

    // Refresh the points-eligible MECA IDs cache before processing
    await this.refreshPointsEligibleCache();

    // Process each group
    for (const [key, groupResults] of groupedResults) {
      // Sort by score (descending - higher score is better)
      groupResults.sort((a, b) => b.score - a.score);

      // Assign placement and calculate points
      let currentPlacement = 1;
      for (const result of groupResults) {
        result.placement = currentPlacement;

        // Get MECA ID from result (now stored directly on competition result)
        const mecaId = result.mecaId;

        // Check eligibility using the new membership-based system
        // Points are only awarded to MECA IDs from active Competitor, Retailer, or Manufacturer memberships
        const isEligible = await this.isMemberEligibleAsync(mecaId);

        if (isEligible && pointsConfig) {
          // Get format from class or result
          let format = result.format;
          const competitionClass = classMap.get(result.classId || '');
          if (competitionClass) {
            format = competitionClass.format;
          }

          if (format) {
            result.pointsEarned = this.calculatePoints(
              currentPlacement,
              multiplier,
              format,
              pointsConfig
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

    // Check World Finals qualifications for all affected competitors
    // Tracked per MECA ID + class combination (a competitor can qualify in multiple classes)
    if (this.worldFinalsService && event.season?.id) {
      const processedCombinations = new Set<string>();

      for (const result of results) {
        // Skip guests
        if (!result.mecaId || result.mecaId === '999999' || result.mecaId === '0') {
          continue;
        }

        // Skip already-processed MECA ID + class combinations
        const comboKey = `${result.mecaId}:${result.competitionClass}`;
        if (processedCombinations.has(comboKey)) {
          continue;
        }
        processedCombinations.add(comboKey);

        // Check if this competitor qualifies in this class
        const mecaIdNum = parseInt(result.mecaId, 10);
        if (!isNaN(mecaIdNum)) {
          await this.worldFinalsService.checkAndUpdateQualification(
            mecaIdNum,
            result.competitorName,
            result.competitor?.id || null,
            event.season.id,
            result.competitionClass,
          );
        }
      }
    }

    // Check achievements for all results with linked competitors
    if (this.achievementsService) {
      for (const result of results) {
        if (result.competitor?.id) {
          try {
            await this.achievementsService.checkAndAwardAchievements(result.id);
          } catch (error) {
            this.logger.warn(`Failed to check achievements for result ${result.id}: ${error}`);
          }
        }
      }
    }
  }

  /**
   * Recalculate points for all events in a season
   * Used when points configuration is changed
   */
  async recalculateSeasonPoints(seasonId: string): Promise<{ events_processed: number; results_updated: number; duration_ms: number }> {
    const startTime = Date.now();
    const em = this.em.fork();

    // Verify season exists
    const season = await em.findOne(Season, { id: seasonId });
    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    // Get all events for this season
    const events = await em.find(Event, { season: seasonId });

    this.logger.log(`Recalculating points for ${events.length} events in season ${season.name}`);

    let eventsProcessed = 0;
    let totalResultsUpdated = 0;

    for (const event of events) {
      try {
        // Count results before update for tracking
        const resultCount = await em.count(CompetitionResult, { event: event.id });

        await this.updateEventPoints(event.id);

        eventsProcessed++;
        totalResultsUpdated += resultCount;

        this.logger.debug(`Recalculated points for event ${event.title} (${resultCount} results)`);
      } catch (error) {
        this.logger.error(`Failed to recalculate points for event ${event.id}: ${error}`);
      }
    }

    const duration = Date.now() - startTime;
    this.logger.log(`Season points recalculation complete: ${eventsProcessed} events, ${totalResultsUpdated} results in ${duration}ms`);

    return {
      events_processed: eventsProcessed,
      results_updated: totalResultsUpdated,
      duration_ms: duration,
    };
  }

  /**
   * Import multiple results from a file
   * Looks up competitors by MECA ID and handles null competitor_id properly
   */
  async importResults(
    eventId: string,
    parsedResults: any[],
    createdBy: string,
    fileExtension: string,
    file?: Express.Multer.File
  ): Promise<{ message: string; imported: number; errors: string[] }> {
    const em = this.em.fork();
    const errors: string[] = [];
    let imported = 0;

    // Fetch the event to get its season_id
    const event = await em.findOne(Event, { id: eventId }, { populate: ['season'] });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    const eventSeasonId = event.season?.id || null;

    // Determine entry method based on file extension
    const entryMethod = fileExtension === 'xlsx' || fileExtension === 'xls' ? 'excel' : 'termlab';

    // Get format from first result if available
    const format = parsedResults.length > 0 ? parsedResults[0].format : null;

    // Create audit session
    const session = await this.auditService.createSession({
      eventId,
      userId: createdBy,
      entryMethod,
      format,
      filePath: file ? 'pending' : undefined,
      originalFilename: file?.originalname,
    });
    this.currentSessionId = session.id;

    // Save uploaded file if provided and update session with file path
    if (file) {
      const filePath = await this.auditService.saveUploadedFile(file, eventId, session.id);
      await this.auditService.updateSessionFilePath(session.id, filePath);
    }

    // Fetch all profiles (for backward compatibility with name matching)
    const profiles = await em.find(Profile, {});
    const today = new Date();

    // Fetch all competition classes to match class names
    const competitionClasses = await em.find(CompetitionClass, {});

    // Fetch all active memberships with MECA IDs for the new membership-based system
    // Points-eligible categories: Competitor, Retailer, Manufacturer
    const pointsEligibleCategories = [
      MembershipCategory.COMPETITOR,
      MembershipCategory.RETAIL,
      MembershipCategory.MANUFACTURER,
    ];

    const activeMemberships = await em.find(
      Membership,
      {
        mecaId: { $ne: null },
        paymentStatus: PaymentStatus.PAID,
        membershipTypeConfig: { category: { $in: pointsEligibleCategories } },
        $or: [{ endDate: null }, { endDate: { $gt: today } }],
      },
      {
        populate: ['membershipTypeConfig', 'user'],
      }
    );

    // Create a map for quick MECA ID lookups
    const mecaIdToMembership = new Map<number, Membership>();
    for (const membership of activeMemberships) {
      if (membership.mecaId) {
        mecaIdToMembership.set(membership.mecaId, membership);
      }
    }

    // Also refresh the points-eligible cache
    await this.refreshPointsEligibleCache();

    for (const result of parsedResults) {
      try {
        let finalMecaId: string | null = null;
        let finalName: string = result.name || '';
        let competitorId: string | null = null;
        let hasValidActiveMembership = false; // Track if they have active membership

        // SCENARIO 1: MECA ID provided in file
        if (result.memberID && result.memberID !== '999999') {
          const mecaIdNum = parseInt(result.memberID, 10);
          const membership = !isNaN(mecaIdNum) ? mecaIdToMembership.get(mecaIdNum) : undefined;

          if (membership) {
            // Valid active member with points-eligible membership
            finalMecaId = membership.mecaId!.toString();
            // Use competitor name from membership if available, otherwise use profile name
            finalName = membership.getCompetitorDisplayName() || result.name;
            competitorId = membership.user?.id || null;
            hasValidActiveMembership = true; // ✅ Active membership confirmed
          } else {
            // MECA ID not found in active memberships - check profile for backward compatibility
            const profile = profiles.find(p => p.meca_id === result.memberID);
            finalMecaId = result.memberID; // Keep the MECA ID from file
            if (profile) {
              finalName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || result.name;
              competitorId = profile.id;
            } else {
              finalName = result.name;
              competitorId = null;
            }
            hasValidActiveMembership = false; // ❌ No active points-eligible membership
          }
        }
        // SCENARIO 2: No MECA ID, but name provided - try to match by name
        else if (!result.memberID || result.memberID === '999999') {
          if (result.name) {
            // Try to find active member by name from memberships first
            const nameParts = result.name.trim().split(/\s+/);
            const firstName = nameParts[0]?.toLowerCase();
            const lastName = nameParts.slice(1).join(' ')?.toLowerCase();

            // Search in active memberships by competitor name
            const matchedMembership = activeMemberships.find(m => {
              const competitorName = m.getCompetitorDisplayName()?.toLowerCase();
              return competitorName === result.name.toLowerCase() ||
                     (m.competitorName?.toLowerCase() === result.name.toLowerCase());
            });

            if (matchedMembership) {
              // Found active member by name in memberships
              finalMecaId = matchedMembership.mecaId!.toString();
              finalName = matchedMembership.getCompetitorDisplayName() || result.name;
              competitorId = matchedMembership.user?.id || null;
              hasValidActiveMembership = true; // ✅ Active membership confirmed
            } else {
              // Fall back to profile matching
              const profile = profiles.find(p => {
                const matchesName =
                  (p.first_name?.toLowerCase() === firstName &&
                   p.last_name?.toLowerCase() === lastName) ||
                  `${p.first_name} ${p.last_name}`.toLowerCase() === result.name.toLowerCase();
                return matchesName;
              });

              if (profile && profile.meca_id) {
                // Found profile - check if their MECA ID is points-eligible
                const mecaIdNum = parseInt(profile.meca_id, 10);
                hasValidActiveMembership = !isNaN(mecaIdNum) && this.pointsEligibleMecaIds.has(mecaIdNum);
                finalMecaId = profile.meca_id;
                finalName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                competitorId = profile.id;
              } else {
                // No match found - use 999999
                finalMecaId = '999999';
                finalName = result.name;
                competitorId = null;
                hasValidActiveMembership = false; // ❌ No active membership
              }
            }
          } else {
            // No name and no MECA ID - skip or error
            finalMecaId = '999999';
            finalName = 'Unknown Competitor';
            competitorId = null;
            hasValidActiveMembership = false; // ❌ No active membership
          }
        }

        // Try to find class_id by matching class name and format
        // Uses case-insensitive matching and falls back to mapping table
        let classId: string | null = null;
        if (result.class && result.format) {
          // 1. First try case-insensitive exact match
          const foundClass = competitionClasses.find(
            c => c.name.toLowerCase() === result.class.toLowerCase() &&
                 c.format.toLowerCase() === result.format.toLowerCase()
          );

          if (foundClass) {
            classId = foundClass.id;
          } else {
            // 2. Check the class name mappings table
            const mapping = await em.findOne(ClassNameMapping, {
              sourceName: { $ilike: result.class },
              isActive: true,
            });

            if (mapping?.targetClassId) {
              classId = mapping.targetClassId;
              console.log(`[IMPORT] Mapped "${result.class}" to class ID ${classId} via mapping table`);
            } else {
              // 3. Log unmapped class for admin attention
              console.warn(`[IMPORT] No class match found for "${result.class}" (${result.format}) - will show as Unknown`);
            }
          }
        }

        // Points are only assigned if MECA ID belongs to an active Competitor, Retailer, or Manufacturer membership
        const pointsEarned = hasValidActiveMembership ? (result.points || 0) : 0;

        await this.create({
          event_id: eventId,
          season_id: eventSeasonId,
          competitor_id: competitorId,
          competitor_name: finalName,
          meca_id: finalMecaId,
          competition_class: result.class,
          class_id: classId,
          format: result.format || null,
          score: result.score,
          placement: result.placement || 0,
          points_earned: pointsEarned,
          vehicle_info: result.vehicleInfo || null,
          wattage: result.wattage || null,
          frequency: result.frequency || null,
          notes: `Imported from ${fileExtension} file`,
          created_by: createdBy,
        } as any, createdBy);
        imported++;
      } catch (error: any) {
        errors.push(`Failed to import ${result.name} in ${result.class}: ${error.message}`);
      }
    }

    // End the audit session with final result count
    await this.auditService.endSession(session.id, imported);
    this.currentSessionId = null;

    return {
      message: `Successfully imported ${imported} of ${parsedResults.length} results`,
      imported,
      errors,
    };
  }

  /**
   * Check if wattage/frequency is required for a given format and class
   * Required for all SPL classes except Dueling Demos
   */
  private isWattageFrequencyRequired(format: string, className: string): boolean {
    if (!format || format.toUpperCase() !== 'SPL') return false;
    const exemptClasses = ['dueling demos'];
    const classLower = (className || '').toLowerCase();
    return !exemptClasses.some(exempt => classLower.includes(exempt));
  }

  /**
   * Parse and validate results from a file before importing
   * Returns parsed data with flags for name matches needing confirmation and missing required fields
   */
  async parseAndValidate(
    eventId: string,
    parsedResults: any[]
  ): Promise<{
    results: Array<{
      index: number;
      data: any;
      nameMatch?: {
        matchedMecaId: string;
        matchedName: string;
        matchedCompetitorId: string | null;
        confidence: 'exact' | 'partial';
      };
      missingFields: string[];
      isValid: boolean;
      validationErrors: string[];
    }>;
    totalCount: number;
    needsNameConfirmation: number;
    needsDataCompletion: number;
  }> {
    const em = this.em.fork();
    const today = new Date();

    // Fetch active memberships for name matching
    const pointsEligibleCategories = [
      MembershipCategory.COMPETITOR,
      MembershipCategory.RETAIL,
      MembershipCategory.MANUFACTURER,
    ];

    const activeMemberships = await em.find(
      Membership,
      {
        mecaId: { $ne: null },
        paymentStatus: PaymentStatus.PAID,
        membershipTypeConfig: { category: { $in: pointsEligibleCategories } },
        $or: [{ endDate: null }, { endDate: { $gt: today } }],
      },
      {
        populate: ['membershipTypeConfig', 'user'],
      }
    );

    // Also fetch profiles for fallback matching
    const profiles = await em.find(Profile, {});

    const results: Array<{
      index: number;
      data: any;
      nameMatch?: {
        matchedMecaId: string;
        matchedName: string;
        matchedCompetitorId: string | null;
        confidence: 'exact' | 'partial';
      };
      missingFields: string[];
      isValid: boolean;
      validationErrors: string[];
    }> = [];

    let needsNameConfirmation = 0;
    let needsDataCompletion = 0;

    for (let i = 0; i < parsedResults.length; i++) {
      const result = parsedResults[i];
      const validationErrors: string[] = [];
      const missingFields: string[] = [];
      let nameMatch: {
        matchedMecaId: string;
        matchedName: string;
        matchedCompetitorId: string | null;
        confidence: 'exact' | 'partial';
      } | undefined = undefined;

      // Validate required fields
      if (!result.name || result.name.trim() === '') {
        validationErrors.push('Name is required');
      }
      if (!result.class || result.class.trim() === '') {
        validationErrors.push('Class is required');
      }
      if (result.score === undefined || result.score === null || result.score === '') {
        validationErrors.push('Score is required');
      }

      // Check for wattage/frequency requirement (SPL classes except Dueling Demos)
      const format = result.format || 'SPL';
      if (this.isWattageFrequencyRequired(format, result.class)) {
        if (!result.wattage) {
          missingFields.push('wattage');
        }
        if (!result.frequency) {
          missingFields.push('frequency');
        }
      }

      // Check for name match when MECA ID is not provided
      if ((!result.memberID || result.memberID === '999999' || result.memberID === '0') && result.name) {
        const nameLower = result.name.toLowerCase().trim();

        // Search in active memberships by competitor name
        const matchedMembership = activeMemberships.find(m => {
          const competitorName = m.getCompetitorDisplayName()?.toLowerCase().trim();
          return competitorName === nameLower ||
                 (m.competitorName?.toLowerCase().trim() === nameLower);
        });

        if (matchedMembership) {
          nameMatch = {
            matchedMecaId: matchedMembership.mecaId!.toString(),
            matchedName: matchedMembership.getCompetitorDisplayName() || result.name,
            matchedCompetitorId: matchedMembership.user?.id || null,
            confidence: 'exact',
          };
          needsNameConfirmation++;
        } else {
          // Fall back to profile matching
          const profile = profiles.find(p => {
            const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().trim();
            return fullName === nameLower;
          });

          if (profile && profile.meca_id) {
            nameMatch = {
              matchedMecaId: profile.meca_id,
              matchedName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
              matchedCompetitorId: profile.id,
              confidence: 'exact',
            };
            needsNameConfirmation++;
          }
        }
      }

      if (missingFields.length > 0) {
        needsDataCompletion++;
      }

      const isValid = validationErrors.length === 0;

      results.push({
        index: i,
        data: {
          ...result,
          format: format,
        },
        nameMatch,
        missingFields,
        isValid,
        validationErrors,
      });
    }

    return {
      results,
      totalCount: parsedResults.length,
      needsNameConfirmation,
      needsDataCompletion,
    };
  }

  /**
   * Check for duplicate results before importing
   * Returns conflicts that need user resolution
   */
  async checkForDuplicates(
    eventId: string,
    parsedResults: any[]
  ): Promise<{
    duplicates: Array<{
      index: number;
      importData: any;
      existingData: any;
      matchType: 'meca_id' | 'name';
    }>;
    nonDuplicates: number[];
  }> {
    const em = this.em.fork();

    // Get existing results for this event
    const existingResults = await em.find(CompetitionResult, { event: eventId });

    const duplicates: Array<{
      index: number;
      importData: any;
      existingData: any;
      matchType: 'meca_id' | 'name';
    }> = [];
    const nonDuplicates: number[] = [];

    for (let i = 0; i < parsedResults.length; i++) {
      const result = parsedResults[i];
      const format = result.format || 'SPL';
      const className = result.class;
      const mecaId = result.memberID;
      const name = result.name;

      let existingMatch = null;
      let matchType: 'meca_id' | 'name' = 'meca_id';

      // For members (MECA ID != 999999): Match by format + class + MECA ID
      if (mecaId && mecaId !== '999999') {
        existingMatch = existingResults.find(
          r => r.format?.toLowerCase() === format?.toLowerCase() &&
               r.competitionClass?.toLowerCase() === className?.toLowerCase() &&
               r.mecaId === mecaId
        );
        matchType = 'meca_id';
      }

      // For non-members (MECA ID = 999999): Match by format + class + name
      if (!existingMatch && (!mecaId || mecaId === '999999') && name) {
        existingMatch = existingResults.find(
          r => r.format?.toLowerCase() === format?.toLowerCase() &&
               r.competitionClass?.toLowerCase() === className?.toLowerCase() &&
               r.mecaId === '999999' &&
               r.competitorName?.toLowerCase() === name?.toLowerCase()
        );
        matchType = 'name';
      }

      if (existingMatch) {
        duplicates.push({
          index: i,
          importData: {
            memberID: mecaId,
            name: name,
            class: className,
            format: format,
            score: result.score,
            placement: result.placement,
            points: result.points,
            wattage: result.wattage,
            frequency: result.frequency,
          },
          existingData: {
            id: existingMatch.id,
            mecaId: existingMatch.mecaId,
            competitorName: existingMatch.competitorName,
            competitionClass: existingMatch.competitionClass,
            format: existingMatch.format,
            score: existingMatch.score,
            placement: existingMatch.placement,
            pointsEarned: existingMatch.pointsEarned,
            wattage: existingMatch.wattage,
            frequency: existingMatch.frequency,
          },
          matchType,
        });
      } else {
        nonDuplicates.push(i);
      }
    }

    return { duplicates, nonDuplicates };
  }

  /**
   * Import results with duplicate resolution
   * Resolutions: 'skip' = keep existing, 'replace' = use imported value
   */
  async importResultsWithResolution(
    eventId: string,
    parsedResults: any[],
    createdBy: string,
    fileExtension: string,
    resolutions: Record<number, 'skip' | 'replace'>,
    file?: Express.Multer.File,
    ipAddress?: string
  ): Promise<{ message: string; imported: number; updated: number; skipped: number; errors: string[] }> {
    const em = this.em.fork();
    const errors: string[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // Fetch the event to get its season_id
    const event = await em.findOne(Event, { id: eventId }, { populate: ['season'] });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    const eventSeasonId = event.season?.id || null;

    // Determine entry method based on file extension
    const entryMethod = fileExtension === 'xlsx' || fileExtension === 'xls' ? 'excel' : 'termlab';

    // Get format from first result if available
    const format = parsedResults.length > 0 ? parsedResults[0].format : null;

    // Create audit session
    const session = await this.auditService.createSession({
      eventId,
      userId: createdBy,
      entryMethod,
      format,
      filePath: file ? 'pending' : undefined,
      originalFilename: file?.originalname,
    });
    this.currentSessionId = session.id;

    // Save uploaded file if provided
    if (file) {
      const filePath = await this.auditService.saveUploadedFile(file, eventId, session.id);
      await this.auditService.updateSessionFilePath(session.id, filePath);
    }

    // Fetch all profiles (for backward compatibility with name matching)
    const profiles = await em.find(Profile, {});
    const today = new Date();

    // Fetch all competition classes
    const competitionClasses = await em.find(CompetitionClass, {});

    // Get existing results for this event (for replacement)
    const existingResults = await em.find(CompetitionResult, { event: eventId });

    // Fetch all active memberships with MECA IDs for the new membership-based system
    // Points-eligible categories: Competitor, Retailer, Manufacturer
    const pointsEligibleCategories = [
      MembershipCategory.COMPETITOR,
      MembershipCategory.RETAIL,
      MembershipCategory.MANUFACTURER,
    ];

    const activeMemberships = await em.find(
      Membership,
      {
        mecaId: { $ne: null },
        paymentStatus: PaymentStatus.PAID,
        membershipTypeConfig: { category: { $in: pointsEligibleCategories } },
        $or: [{ endDate: null }, { endDate: { $gt: today } }],
      },
      {
        populate: ['membershipTypeConfig', 'user'],
      }
    );

    // Create a map for quick MECA ID lookups
    const mecaIdToMembership = new Map<number, Membership>();
    for (const membership of activeMemberships) {
      if (membership.mecaId) {
        mecaIdToMembership.set(membership.mecaId, membership);
      }
    }

    // Refresh the points-eligible cache
    await this.refreshPointsEligibleCache();

    for (let i = 0; i < parsedResults.length; i++) {
      const result = parsedResults[i];

      // Check if this index has a resolution
      const resolution = resolutions[i];

      // If resolution is 'skip', skip this result
      if (resolution === 'skip') {
        skipped++;
        continue;
      }

      try {
        let finalMecaId: string | null = null;
        let finalName: string = result.name || '';
        let competitorId: string | null = null;
        let hasValidActiveMembership = false;

        // SCENARIO 1: MECA ID provided in file
        if (result.memberID && result.memberID !== '999999') {
          const mecaIdNum = parseInt(result.memberID, 10);
          const membership = !isNaN(mecaIdNum) ? mecaIdToMembership.get(mecaIdNum) : undefined;

          if (membership) {
            // Valid active member with points-eligible membership
            finalMecaId = membership.mecaId!.toString();
            finalName = membership.getCompetitorDisplayName() || result.name;
            competitorId = membership.user?.id || null;
            hasValidActiveMembership = true;
          } else {
            // MECA ID not found in active memberships - check profile for backward compatibility
            const profile = profiles.find(p => p.meca_id === result.memberID);
            finalMecaId = result.memberID;
            if (profile) {
              finalName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || result.name;
              competitorId = profile.id;
            } else {
              finalName = result.name;
              competitorId = null;
            }
            hasValidActiveMembership = false;
          }
        }
        // SCENARIO 2: No MECA ID, but name provided
        else if (!result.memberID || result.memberID === '999999') {
          if (result.name) {
            const nameParts = result.name.trim().split(/\s+/);
            const firstName = nameParts[0]?.toLowerCase();
            const lastName = nameParts.slice(1).join(' ')?.toLowerCase();

            // Search in active memberships by competitor name first
            const matchedMembership = activeMemberships.find(m => {
              const competitorName = m.getCompetitorDisplayName()?.toLowerCase();
              return competitorName === result.name.toLowerCase() ||
                     (m.competitorName?.toLowerCase() === result.name.toLowerCase());
            });

            if (matchedMembership) {
              finalMecaId = matchedMembership.mecaId!.toString();
              finalName = matchedMembership.getCompetitorDisplayName() || result.name;
              competitorId = matchedMembership.user?.id || null;
              hasValidActiveMembership = true;
            } else {
              // Fall back to profile matching
              const profile = profiles.find(p => {
                const matchesName =
                  (p.first_name?.toLowerCase() === firstName &&
                   p.last_name?.toLowerCase() === lastName) ||
                  `${p.first_name} ${p.last_name}`.toLowerCase() === result.name.toLowerCase();
                return matchesName;
              });

              if (profile && profile.meca_id) {
                const mecaIdNum = parseInt(profile.meca_id, 10);
                hasValidActiveMembership = !isNaN(mecaIdNum) && this.pointsEligibleMecaIds.has(mecaIdNum);
                finalMecaId = profile.meca_id;
                finalName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                competitorId = profile.id;
              } else {
                finalMecaId = '999999';
                finalName = result.name;
                competitorId = null;
                hasValidActiveMembership = false;
              }
            }
          } else {
            finalMecaId = '999999';
            finalName = 'Unknown Competitor';
            competitorId = null;
            hasValidActiveMembership = false;
          }
        }

        // Find class_id
        let classId: string | null = null;
        if (result.class && result.format) {
          const foundClass = competitionClasses.find(
            c => c.name.toLowerCase() === result.class.toLowerCase() &&
                 c.format.toLowerCase() === result.format.toLowerCase()
          );

          if (foundClass) {
            classId = foundClass.id;
          } else {
            const mapping = await em.findOne(ClassNameMapping, {
              sourceName: { $ilike: result.class },
              isActive: true,
            });
            if (mapping?.targetClassId) {
              classId = mapping.targetClassId;
            }
          }
        }

        // Points are only assigned if MECA ID belongs to an active Competitor, Retailer, or Manufacturer membership
        const pointsEarned = hasValidActiveMembership ? (result.points || 0) : 0;

        // If resolution is 'replace', find and update existing record
        if (resolution === 'replace') {
          // Find the existing record to replace
          let existingMatch = null;

          if (result.memberID && result.memberID !== '999999') {
            existingMatch = existingResults.find(
              r => r.format?.toLowerCase() === result.format?.toLowerCase() &&
                   r.competitionClass?.toLowerCase() === result.class?.toLowerCase() &&
                   r.mecaId === result.memberID
            );
          } else if (result.name) {
            existingMatch = existingResults.find(
              r => r.format?.toLowerCase() === result.format?.toLowerCase() &&
                   r.competitionClass?.toLowerCase() === result.class?.toLowerCase() &&
                   r.mecaId === '999999' &&
                   r.competitorName?.toLowerCase() === result.name?.toLowerCase()
            );
          }

          if (existingMatch) {
            // Update existing record
            await this.update(existingMatch.id, {
              competitor_id: competitorId,
              competitor_name: finalName,
              meca_id: finalMecaId,
              score: result.score,
              placement: result.placement || 0,
              points_earned: pointsEarned,
              wattage: result.wattage || null,
              frequency: result.frequency || null,
              notes: `Updated from ${fileExtension} import`,
            } as any, createdBy, ipAddress);
            updated++;
            continue;
          }
        }

        // Create new record
        await this.create({
          event_id: eventId,
          season_id: eventSeasonId,
          competitor_id: competitorId,
          competitor_name: finalName,
          meca_id: finalMecaId,
          competition_class: result.class,
          class_id: classId,
          format: result.format || null,
          score: result.score,
          placement: result.placement || 0,
          points_earned: pointsEarned,
          vehicle_info: result.vehicleInfo || null,
          wattage: result.wattage || null,
          frequency: result.frequency || null,
          notes: `Imported from ${fileExtension} file`,
          created_by: createdBy,
        } as any, createdBy);
        imported++;
      } catch (error: any) {
        errors.push(`Failed to import ${result.name} in ${result.class}: ${error.message}`);
      }
    }

    // End the audit session
    await this.auditService.endSession(session.id, imported + updated);
    this.currentSessionId = null;

    return {
      message: `Imported: ${imported}, Updated: ${updated}, Skipped: ${skipped}`,
      imported,
      updated,
      skipped,
      errors,
    };
  }
}
