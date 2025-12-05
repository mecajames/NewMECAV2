import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, Reference, wrap } from '@mikro-orm/core';
import { CompetitionResult } from './competition-results.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';
import { ClassNameMapping } from '../class-name-mappings/class-name-mappings.entity';
import { Season } from '../seasons/seasons.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CompetitionResultsService {
  private currentSessionId: string | null = null;
  private manualEntryResults: any[] = [];

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly auditService: AuditService,
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
    if (seasonId) {
      filter.season = seasonId;
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
   *
   * Point Structure (NO points awarded below 5th place for ANY event type):
   * 1X Single Point Event: 1st=5, 2nd=4, 3rd=3, 4th=2, 5th=1
   * 2X Double Points Event: 1st=10, 2nd=8, 3rd=6, 4th=4, 5th=2
   * 3X Triple Points Event (SOUNDFEST): 1st=15, 2nd=12, 3rd=9, 4th=6, 5th=3
   * 4X Points Event (SQ, Install, RTA, SQ2/SQ2+): 1st=20, 2nd=19, 3rd=18, 4th=17, 5th=16
   */
  private calculatePoints(placement: number, multiplier: number, format: string): number {
    // No points for multiplier 0 (non-competitive events)
    if (multiplier === 0) {
      return 0;
    }

    // Only top 5 placements receive points - NO exceptions
    if (placement < 1 || placement > 5) {
      return 0;
    }

    // 4X Points Event - Special scoring (SQ, Install, RTA, SQ2/SQ2+)
    if (multiplier === 4) {
      const fourXPoints: { [key: number]: number } = {
        1: 20,
        2: 19,
        3: 18,
        4: 17,
        5: 16,
      };
      return fourXPoints[placement] || 0;
    }

    // Standard events (1X, 2X, 3X) - Base points × multiplier
    const basePoints: { [key: number]: number } = {
      1: 5,
      2: 4,
      3: 3,
      4: 2,
      5: 1,
    };

    return (basePoints[placement] || 0) * multiplier;
  }

  /**
   * Check if a member is eligible for points
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
    if (membershipStatus && membershipStatus !== 'active') {
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

    // Fetch the event with its multiplier
    const event = await em.findOne(Event, { id: eventId });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const multiplier = event.pointsMultiplier || 2; // Default to 2x if not set

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
        let membershipStatus: string | undefined;

        if (result.competitor) {
          await em.populate(result, ['competitor']);
          mecaId = result.competitor.meca_id || mecaId;
          membershipExpiry = result.competitor.membership_expiry;
          membershipStatus = result.competitor.membership_status;
        }

        // Check eligibility and calculate points
        if (this.isMemberEligible(mecaId, membershipExpiry, membershipStatus)) {
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
              format
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

    // Fetch all profiles
    const profiles = await em.find(Profile, {});
    const today = new Date();

    // Fetch all competition classes to match class names
    const competitionClasses = await em.find(CompetitionClass, {});

    for (const result of parsedResults) {
      try {
        let finalMecaId: string | null = null;
        let finalName: string = result.name || '';
        let competitorId: string | null = null;
        let hasValidActiveMembership = false; // Track if they have active membership

        // Helper function to check if membership is active
        const hasActiveMembership = (profile: Profile): boolean => {
          if (profile.membership_status !== 'active') {
            return false;
          }

          // If no expiry date, treat as active (no expiration)
          if (!profile.membership_expiry) {
            return true;
          }

          // If expiry exists, check if it's in the future
          return new Date(profile.membership_expiry) > today;
        };

        // SCENARIO 1: MECA ID provided in file
        if (result.memberID && result.memberID !== '999999') {
          const profile = profiles.find(p => p.meca_id === result.memberID);

          if (profile && hasActiveMembership(profile)) {
            // Valid active member - use system data
            finalMecaId = profile.meca_id || null;
            finalName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || result.name;
            competitorId = profile.id;
            hasValidActiveMembership = true; // ✅ Active membership confirmed
          } else {
            // Member not in system or expired - KEEP the file MECA ID but don't assign points
            finalMecaId = result.memberID; // Keep the MECA ID from file
            finalName = result.name; // Use name from file
            competitorId = null;
            hasValidActiveMembership = false; // ❌ No active membership (no points)
          }
        }
        // SCENARIO 2: No MECA ID, but name provided - try to match by name
        else if (!result.memberID || result.memberID === '999999') {
          if (result.name) {
            // Try to find active member by name
            const nameParts = result.name.trim().split(/\s+/);
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            const profile = profiles.find(p => {
              const matchesName =
                (p.first_name?.toLowerCase() === firstName?.toLowerCase() &&
                 p.last_name?.toLowerCase() === lastName?.toLowerCase()) ||
                `${p.first_name} ${p.last_name}`.toLowerCase() === result.name.toLowerCase();
              return matchesName && hasActiveMembership(p);
            });

            if (profile) {
              // Found active member by name - use system data
              finalMecaId = profile.meca_id || '999999';
              finalName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
              competitorId = profile.id;
              hasValidActiveMembership = true; // ✅ Active membership confirmed
            } else {
              // No match found - use 999999
              finalMecaId = '999999';
              finalName = result.name;
              competitorId = null;
              hasValidActiveMembership = false; // ❌ No active membership
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

        // Only assign points if they have VALID ACTIVE membership
        // This means: MECA ID is not 999999 AND membership_status is 'active' AND not expired
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

    // Fetch all profiles
    const profiles = await em.find(Profile, {});
    const today = new Date();

    // Fetch all competition classes
    const competitionClasses = await em.find(CompetitionClass, {});

    // Get existing results for this event (for replacement)
    const existingResults = await em.find(CompetitionResult, { event: eventId });

    // Helper function to check if membership is active
    const hasActiveMembership = (profile: Profile): boolean => {
      if (profile.membership_status !== 'active') {
        return false;
      }
      if (!profile.membership_expiry) {
        return true;
      }
      return new Date(profile.membership_expiry) > today;
    };

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
          const profile = profiles.find(p => p.meca_id === result.memberID);

          if (profile && hasActiveMembership(profile)) {
            finalMecaId = profile.meca_id || null;
            finalName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || result.name;
            competitorId = profile.id;
            hasValidActiveMembership = true;
          } else {
            finalMecaId = result.memberID;
            finalName = result.name;
            competitorId = null;
            hasValidActiveMembership = false;
          }
        }
        // SCENARIO 2: No MECA ID, but name provided
        else if (!result.memberID || result.memberID === '999999') {
          if (result.name) {
            const nameParts = result.name.trim().split(/\s+/);
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            const profile = profiles.find(p => {
              const matchesName =
                (p.first_name?.toLowerCase() === firstName?.toLowerCase() &&
                 p.last_name?.toLowerCase() === lastName?.toLowerCase()) ||
                `${p.first_name} ${p.last_name}`.toLowerCase() === result.name.toLowerCase();
              return matchesName && hasActiveMembership(p);
            });

            if (profile) {
              finalMecaId = profile.meca_id || '999999';
              finalName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
              competitorId = profile.id;
              hasValidActiveMembership = true;
            } else {
              finalMecaId = '999999';
              finalName = result.name;
              competitorId = null;
              hasValidActiveMembership = false;
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
