import { Injectable, Inject, NotFoundException, BadRequestException, Optional, Logger } from '@nestjs/common';
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
import { ResultTeamsService } from '../result-teams/result-teams.service';

@Injectable()
export class CompetitionResultsService {
  private currentSessionId: string | null = null;
  private manualEntryResults: any[] = [];

  // Cache for points-eligible MECA IDs to avoid repeated DB queries
  private pointsEligibleMecaIds: Set<number> = new Set();
  private pointsEligibleCacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private readonly logger = new Logger(CompetitionResultsService.name);

  // Days past membership end_date during which we still want the back-fill
  // mechanic to kick in. Matches the MECA ID admin-extension cutoff
  // (MecaIdService.GRACE_ADMIN_DAYS).
  private static readonly RESULT_BACKFILL_GRACE_DAYS = 45;

  /**
   * If the looked-up MECA ID on an incoming result belongs to a member
   * whose membership is currently expired but within the 45-day grace
   * window, rewrite the row to `meca_id = '999999'` and stash the
   * original ID on `original_meca_id` + flag `pending_back_fill = true`.
   * The renewal flow will read these flags to restore the rows.
   *
   * Mutates transformedData in place.
   */
  private async applyExpiredMecaIdStamping(transformedData: any, em: EntityManager): Promise<void> {
    const inboundMecaId: string | undefined = transformedData?.mecaId;
    if (!inboundMecaId || inboundMecaId === '999999' || inboundMecaId === '0') return;

    const mecaIdNum = parseInt(inboundMecaId, 10);
    if (!Number.isFinite(mecaIdNum)) return;

    // Find the most recent paid membership carrying this MECA ID.
    const membership = await em.findOne(
      Membership,
      { mecaId: mecaIdNum, paymentStatus: PaymentStatus.PAID },
      { orderBy: { endDate: 'DESC' } },
    );
    if (!membership?.endDate) return;

    const now = Date.now();
    const end = membership.endDate.getTime();
    if (end >= now) return; // still active — leave row alone

    const daysSinceExpiry = (now - end) / (1000 * 60 * 60 * 24);
    if (daysSinceExpiry > CompetitionResultsService.RESULT_BACKFILL_GRACE_DAYS) {
      // Beyond grace — the ID is permanently retired. Still record under
      // 999999, but no back-fill will ever happen.
      transformedData.mecaId = '999999';
      transformedData.originalMecaId = null;
      transformedData.pendingBackFill = false;
      this.logger.log(`Result for expired-past-grace MECA ID ${inboundMecaId} stamped 999999 (no back-fill)`);
      return;
    }

    transformedData.mecaId = '999999';
    transformedData.originalMecaId = inboundMecaId;
    transformedData.pendingBackFill = true;
    this.logger.log(`Result for expired-in-grace MECA ID ${inboundMecaId} stamped 999999 + pending back-fill (${daysSinceExpiry.toFixed(1)} days expired)`);
  }

  /**
   * Re-attach all `999999 + pending_back_fill = true` result rows belonging
   * to a renewing member back to their reclaimed MECA ID. Called from the
   * memberships renewal flow when MECA ID is reactivated.
   */
  async backFillForRenewal(originalMecaId: string, newMecaId: string): Promise<number> {
    const em = this.em.fork();
    const rows = await em.find(CompetitionResult, {
      originalMecaId,
      pendingBackFill: true,
    });
    if (rows.length === 0) return 0;
    for (const row of rows) {
      row.mecaId = newMecaId;
      row.originalMecaId = undefined;
      row.pendingBackFill = false;
    }
    await em.flush();
    this.logger.log(`Back-filled ${rows.length} result row(s) from 999999 → ${newMecaId}`);
    return rows.length;
  }

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly auditService: AuditService,
    private readonly pointsConfigService: PointsConfigurationService,
    private readonly resultTeamsService: ResultTeamsService,
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
    const results = await em.find(CompetitionResult, { event: eventId }, {
      orderBy: { placement: 'ASC' },
      // Populate creator/updater so the UI can show who entered/edited each
      // result without loading the entire profiles table client-side.
      populate: ['competitor', 'creator', 'updater'],
    });
    // Mask MECA ID on held results (expired member, awaiting renewal)
    return results.map(r => {
      if (r.pointsHeldForRenewal) {
        r.mecaId = undefined;
        r.pointsEarned = 0;
      }
      r.createdByName = this.formatProfileName(r.creator);
      r.updatedByName = this.formatProfileName(r.updater);
      return r;
    });
  }

  /** Build a human-readable display name from a profile, or undefined. */
  private formatProfileName(profile?: Profile): string | undefined {
    if (!profile) return undefined;
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    return name || profile.full_name || profile.email || undefined;
  }

  /**
   * Release held results for a MECA ID when membership is renewed.
   * Recalculates points for released results.
   */
  async releaseHeldResults(mecaId: number): Promise<number> {
    const em = this.em.fork();
    const conn = em.getConnection();

    // Find held results for this MECA ID
    const heldResults = await em.find(CompetitionResult, {
      mecaId: String(mecaId),
      pointsHeldForRenewal: true,
    });

    if (heldResults.length === 0) return 0;

    // Release them — make visible and recalculate points
    for (const result of heldResults) {
      result.pointsHeldForRenewal = false;
      result.releasedAt = new Date();
      result.notes = (result.notes || '').replace(/\s*\|\s*Held:.*$/, '') + ' | Released: membership renewed';
    }

    await em.flush();

    // Recalculate points for the events these results are in
    const eventIds = [...new Set(heldResults.map(r => (r as any).eventId || (r.event as any)?.id).filter(Boolean))];
    for (const eventId of eventIds) {
      try {
        // Re-import will recalculate placements and points
        // For now, just mark the points as eligible — they'll be recalculated on next import
        await conn.execute(
          `UPDATE competition_results SET points_earned = 0 WHERE event_id = ? AND meca_id = ? AND released_at IS NOT NULL`,
          [eventId, String(mecaId)]
        );
      } catch (err) {
        this.logger.error(`Failed to recalculate points for event ${eventId}:`, err);
      }
    }

    this.logger.log(`Released ${heldResults.length} held results for MECA ID ${mecaId}`);
    return heldResults.length;
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

  /**
   * Get result counts for multiple events in a single query
   * Returns a map of eventId -> count
   */
  async getResultCountsByEventIds(eventIds: string[]): Promise<Record<string, number>> {
    if (!eventIds || eventIds.length === 0) {
      return {};
    }

    const em = this.em.fork();
    const connection = em.getConnection();

    // Build parameterized query with placeholders to prevent SQL injection
    const placeholders = eventIds.map(() => '?').join(',');

    // Use raw SQL for efficient counting with GROUP BY (parameterized for security)
    const result = await connection.execute(
      `SELECT event_id, COUNT(*) as count
       FROM competition_results
       WHERE event_id IN (${placeholders})
       GROUP BY event_id`,
      eventIds
    );

    // Convert to a map
    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.event_id] = parseInt(row.count, 10);
    }

    // Fill in zeros for events with no results
    for (const eventId of eventIds) {
      if (!(eventId in counts)) {
        counts[eventId] = 0;
      }
    }

    return counts;
  }

  async findByCompetitor(competitorId: string): Promise<CompetitionResult[]> {
    const em = this.em.fork();
    return em.find(CompetitionResult, { competitor: competitorId });
  }

  async findByCompetitorWithEvent(competitorId: string): Promise<any[]> {
    const em = this.em.fork();
    const results = await em.find(CompetitionResult, { competitor: competitorId }, {
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
          title: result.event.title,
          event_date: result.event.eventDate,
          venue_name: result.event.venueName,
          venue_address: result.event.venueAddress,
          venue_city: result.event.venueCity,
          venue_state: result.event.venueState,
          venue_country: result.event.venueCountry,
          season_id: result.event.season?.id,
        };
      }
      return serialized;
    });
  }

  async findByMecaId(mecaId: string): Promise<any[]> {
    const em = this.em.fork();
    const results = await em.find(CompetitionResult, { mecaId }, {
      orderBy: { createdAt: 'DESC' },
      populate: ['event'],
    });

    return results.map(result => {
      const serialized = wrap(result).toObject() as any;
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
      // Mask MECA ID on held results
      if (result.pointsHeldForRenewal) {
        serialized.meca_id = null;
        serialized.points_earned = 0;
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

    // CLASS IS THE SOURCE OF TRUTH for format + class-name. Whatever the
    // client supplied for `format` / `competition_class` gets overwritten
    // by the values on the linked competition_classes row. This is what
    // killed the "every SQ/DD result mysteriously saves as SPL" bug —
    // imports / forms can no longer drift from the class definition.
    // (Wattage auto-unlimit also lives here since we already have the
    // class entity loaded.)
    const classRef = transformedData.competitionClassEntity;
    if (classRef) {
      const classEntity = await em.findOne(CompetitionClass, { id: classRef.id ?? classRef });
      if (classEntity) {
        if (classEntity.format) {
          transformedData.format = classEntity.format;
        }
        if (classEntity.name) {
          transformedData.competitionClass = classEntity.name;
        }
        if (classEntity.unlimitedWattage) {
          transformedData.wattage = -1;
        }
      }
    }

    // PENDING CLASS REVIEW: if the row couldn't be linked to a class, it
    // goes to the admin "Pending Results" queue. This happens when an Event
    // Director enters/imports a result whose class name matches nothing in
    // the system and chooses "send to admin for review" (EDs can't create
    // classes). Withhold points until an admin resolves it — points are
    // recomputed on approval. Admin/ED matched entries always carry a
    // class_id and skip this entirely.
    if (!transformedData.competitionClassEntity) {
      transformedData.needsClassReview = true;
      transformedData.pointsEarned = 0;
    } else {
      transformedData.needsClassReview = false;
    }

    // If the supplied MECA ID belongs to a member whose membership is
    // currently expired (within the 45-day grace window), stamp the row
    // as 999999 + preserve the original ID for back-fill on renewal.
    // See docs/features/MEMBERSHIP_LIFECYCLE.md §7.
    await this.applyExpiredMecaIdStamping(transformedData, em);

    const result = em.create(CompetitionResult, transformedData);
    await em.persistAndFlush(result);

    // Automatically recalculate points for all results in this event
    if (eventId) {
      try {
        await this.updateEventPoints(eventId);

        // Reload the result to get updated points
        await em.refresh(result);
      } catch (pointsError) {
        this.logger.error(`Failed to recalculate points for event ${eventId} after creating result: ${pointsError}`);
      }
    }

    // Auto-link this result to the competitor's team(s)
    try {
      const competitorId = transformedData.competitor?.id || (data as any).competitor_id;
      await this.resultTeamsService.autoLinkResultToTeam(
        result.id,
        transformedData.mecaId || (data as any).meca_id,
        competitorId,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to auto-link result ${result.id} to team: ${error.message}`);
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

    // CLASS IS THE SOURCE OF TRUTH for format + class-name. Same rule as
    // create(): whatever was in the update payload for `format` /
    // `competition_class` gets overwritten by the linked class row's
    // values. Keeps drift impossible.
    const updateClassRef = transformedData.competitionClassEntity || result.competitionClassEntity;
    if (updateClassRef) {
      const classEntity = await em.findOne(CompetitionClass, { id: updateClassRef.id ?? updateClassRef });
      if (classEntity) {
        if (classEntity.format) {
          transformedData.format = classEntity.format;
        }
        if (classEntity.name) {
          transformedData.competitionClass = classEntity.name;
        }
        if (classEntity.unlimitedWattage) {
          transformedData.wattage = -1;
        }
      }
    }

    // If this update newly links the row to a class, it's no longer pending
    // class review. (Only act when the payload actually set a class — a
    // plain score/notes edit must leave the flag untouched.)
    if (transformedData.competitionClassEntity) {
      transformedData.needsClassReview = false;
    }

    // Explicit per-key assignment — CompetitionResult has serializedName.
    for (const [key, value] of Object.entries(transformedData)) {
      (result as any)[key] = value;
    }
    await em.flush();

    // Automatically recalculate points for all results in this event
    if (eventId) {
      try {
        await this.updateEventPoints(eventId);

        // Reload the result to get updated points
        await em.refresh(result);
      } catch (pointsError) {
        this.logger.error(`Failed to recalculate points for event ${eventId} after updating result ${id}: ${pointsError}`);
        // The result itself was already saved successfully, so we don't throw here.
        // Points will be recalculated on the next update or manual recalculation.
      }
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

  async getLeaderboard(
    seasonId?: string,
    options?: {
      format?: string;
      competitionClass?: string;
      rankBy?: 'points' | 'score';
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      const em = this.em.fork();
      const { format, competitionClass, rankBy = 'points', limit = 10 } = options || {};

      // Get effective season ID
      let effectiveSeasonId = seasonId;
      if (!seasonId) {
        const currentSeason = await em.findOne(Season, { isCurrent: true });
        if (currentSeason) {
          effectiveSeasonId = currentSeason.id;
        }
      }

      // Build filter for MikroORM query
      // Use direct season relationship on CompetitionResult instead of going through event.season
      const filter: any = {};
      if (effectiveSeasonId) {
        filter.season = effectiveSeasonId;
      }
      if (format) {
        filter.format = format;
      }
      if (competitionClass) {
        filter.competitionClass = competitionClass;
      }
      // Never surface rows still awaiting admin class review on the public
      // leaderboard — their class (and therefore points) isn't confirmed.
      filter.needsClassReview = false;

      // Fetch results using MikroORM
      const results = await em.find(CompetitionResult, filter, {
        populate: ['competitor'],
      });

      // Aggregate results in memory
      const competitorMap = new Map<string, {
        competitor_id: string;
        competitor_name: string;
        meca_id: string | null;
        total_points: number;
        events_participated: Set<string>;
        first_place: number;
        second_place: number;
        third_place: number;
        best_score: number;
        is_guest: boolean;
      }>();

      for (const result of results) {
        const mecaId = result.mecaId;
        const isGuest = !mecaId || mecaId === '999999' || mecaId === '0' || mecaId === '';

        // Create a unique key - use meca_id for members, name for guests
        const key = isGuest
          ? `guest_${result.competitorName || 'unknown'}`
          : `meca_${mecaId}`;

        let entry = competitorMap.get(key);
        if (!entry) {
          entry = {
            competitor_id: result.competitor?.id || '',
            competitor_name: result.competitorName || '',
            meca_id: isGuest ? null : mecaId!,
            total_points: 0,
            events_participated: new Set(),
            first_place: 0,
            second_place: 0,
            third_place: 0,
            best_score: 0,
            is_guest: isGuest,
          };
          competitorMap.set(key, entry);
        }

        // Aggregate data
        entry.total_points += result.pointsEarned || 0;
        const eventId = result.eventId;
        if (eventId) {
          entry.events_participated.add(eventId);
        }
        if (result.placement === 1) entry.first_place++;
        if (result.placement === 2) entry.second_place++;
        if (result.placement === 3) entry.third_place++;
        // Parse score as number since PostgreSQL decimal type returns strings
        const numericScore = Number(result.score) || 0;
        if (numericScore > entry.best_score) {
          entry.best_score = numericScore;
        }
      }

      // Convert to array. We used to filter `total_points > 0` here which
      // silently dropped any competitor who participated but didn't earn
      // points — making the chip count (e.g. "SQL (3)") disagree with the
      // visible row count. Now every unique competitor in the filtered
      // result set appears; 0-point entries naturally sink to the bottom
      // under either sort mode (points or best score).
      let entries = Array.from(competitorMap.values())
        .map(e => ({
          competitor_id: e.competitor_id,
          competitor_name: e.competitor_name,
          competition_class: competitionClass || 'Overall',
          total_points: e.total_points,
          events_participated: e.events_participated.size,
          first_place: e.first_place,
          second_place: e.second_place,
          third_place: e.third_place,
          best_score: e.best_score,
          meca_id: e.meca_id,
          is_guest: e.is_guest,
          is_qualified: false,
        }));

      // Sort by the appropriate field
      if (rankBy === 'score') {
        entries.sort((a, b) => b.best_score - a.best_score);
      } else {
        entries.sort((a, b) => b.total_points - a.total_points);
      }

      // Limit results
      entries = entries.slice(0, limit);

      // Get qualification statuses - wrapped in its own try/catch so it doesn't break the leaderboard
      if (effectiveSeasonId && this.worldFinalsService) {
        try {
          const mecaIds = entries
            .filter((e: any) => e.meca_id)
            .map((e: any) => parseInt(e.meca_id, 10))
            .filter((id: number) => !isNaN(id));

          if (mecaIds.length > 0) {
            const qualificationStatuses = await this.worldFinalsService.getQualificationStatuses(
              mecaIds,
              effectiveSeasonId
            );

            for (const entry of entries) {
              if (entry.meca_id) {
                const mecaIdNum = parseInt(entry.meca_id, 10);
                if (!isNaN(mecaIdNum)) {
                  const status = qualificationStatuses.get(mecaIdNum);
                  entry.is_qualified = Array.isArray(status) ? status.length > 0 : !!status;
                }
              }
            }
          }
        } catch (wfError) {
          this.logger.warn('Failed to fetch World Finals qualification statuses, continuing without:', wfError);
        }
      }

      return entries;
    } catch (error) {
      this.logger.error('Error in getLeaderboard:', error);
      throw error;
    }
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

    // Update timestamp FIRST to prevent repeated failing queries
    // If the query fails, we'll use stale/empty cache for this TTL period
    this.pointsEligibleCacheTimestamp = now;

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
   * Check if a MECA ID belongs to an expired member within the 45-day grace period.
   * If so, results should be held (not public, no points) until they renew.
   */
  private async isInGracePeriod(mecaId: string | undefined): Promise<boolean> {
    if (!mecaId || mecaId === '999999' || mecaId === '0' || mecaId.startsWith('99')) return false;

    const em = this.em.fork();
    const now = new Date();
    const graceCutoff = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

    // Find most recent expired membership for this MECA ID (expired within 45 days)
    const membership = await em.findOne(Membership, {
      mecaId: parseInt(mecaId, 10),
      paymentStatus: PaymentStatus.PAID,
      endDate: { $lt: now, $gte: graceCutoff },
    });

    return !!membership;
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
   * Recalculate placements for ALL events with competition results
   * This is used to fix existing data after the placement calculation bug fix
   */
  async recalculateAllPlacements(): Promise<{ processed: number; errors: number }> {
    const em = this.em.fork();
    const connection = em.getConnection();

    // Get all distinct event IDs that have competition results
    this.logger.log('Finding all events with competition results...');
    const eventRows = await connection.execute(`
      SELECT DISTINCT event_id
      FROM competition_results
      WHERE event_id IS NOT NULL
    `);

    const eventIds = eventRows.map((r: any) => r.event_id);
    this.logger.log(`Found ${eventIds.length} events with results to process`);

    let processed = 0;
    let errors = 0;

    for (const eventId of eventIds) {
      try {
        await this.updateEventPoints(eventId);
        processed++;

        if (processed % 50 === 0) {
          this.logger.log(`Processed ${processed}/${eventIds.length} events...`);
        }
      } catch (err: any) {
        this.logger.error(`Error processing event ${eventId}: ${err.message}`);
        errors++;
      }
    }

    this.logger.log(`Recalculation complete: ${processed} events processed, ${errors} errors`);
    return { processed, errors };
  }

  /**
   * Link competitor_id on competition results by matching meca_id to memberships
   * This populates the competitor relationship so we can display profile data (like state)
   */
  async linkCompetitorsByMecaId(): Promise<{ linked: number; alreadyLinked: number; noMatch: number }> {
    const em = this.em.fork();
    const connection = em.getConnection();

    this.logger.log('Starting competitor linking by MECA ID...');

    // Get all competition results that have a meca_id but no competitor_id
    const unlinkedResults = await connection.execute(`
      SELECT cr.id, cr.meca_id
      FROM competition_results cr
      WHERE cr.meca_id IS NOT NULL
        AND cr.meca_id != '999999'
        AND cr.meca_id != '0'
        AND cr.meca_id != ''
        AND cr.competitor_id IS NULL
    `);

    this.logger.log(`Found ${unlinkedResults.length} unlinked results with MECA IDs`);

    // Get all memberships with their user_ids and profile state, keyed by meca_id
    const memberships = await connection.execute(`
      SELECT DISTINCT ON (m.meca_id) m.meca_id, m.user_id, p.state
      FROM memberships m
      JOIN profiles p ON p.id = m.user_id
      WHERE m.meca_id IS NOT NULL AND m.user_id IS NOT NULL
      ORDER BY m.meca_id, m.created_at DESC
    `);

    const mecaIdToProfile = new Map<string, { profileId: string; state: string | null }>();
    for (const m of memberships) {
      if (m.meca_id) {
        mecaIdToProfile.set(m.meca_id.toString(), { profileId: m.user_id, state: m.state || null });
      }
    }

    this.logger.log(`Found ${mecaIdToProfile.size} unique MECA ID -> Profile mappings`);

    let linked = 0;
    let noMatch = 0;
    const updates: Array<{ id: string; profileId: string; state: string | null }> = [];

    for (const result of unlinkedResults) {
      const mecaId = result.meca_id?.toString();
      const profile = mecaIdToProfile.get(mecaId);

      if (profile) {
        updates.push({ id: result.id, profileId: profile.profileId, state: profile.state });
        linked++;
      } else {
        noMatch++;
      }
    }

    // Batch update in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;

      const competitorCases = chunk.map(u => `WHEN '${u.id}' THEN '${u.profileId}'::uuid`).join(' ');
      const stateCases = chunk.map(u => `WHEN '${u.id}' THEN ${u.state ? `'${u.state}'` : 'NULL'}`).join(' ');
      const ids = chunk.map(u => `'${u.id}'`).join(',');

      await connection.execute(`
        UPDATE competition_results
        SET competitor_id = CASE id ${competitorCases} END,
            state_code = CASE id ${stateCases} END
        WHERE id IN (${ids})
      `);

      if ((i + chunkSize) % 5000 === 0) {
        this.logger.log(`Updated ${Math.min(i + chunkSize, updates.length)}/${updates.length} results...`);
      }
    }

    // Count already linked
    const alreadyLinkedResult = await connection.execute(`
      SELECT COUNT(*) as count FROM competition_results WHERE competitor_id IS NOT NULL
    `);
    const alreadyLinked = parseInt(alreadyLinkedResult[0]?.count || '0', 10) - linked;

    this.logger.log(`Linking complete: ${linked} linked, ${alreadyLinked} already linked, ${noMatch} no matching profile`);
    return { linked, alreadyLinked, noMatch };
  }

  /**
   * Populate state_code for all results that have a competitor_id but no state_code
   */
  async populateStateFromProfiles(): Promise<{ updated: number }> {
    const em = this.em.fork();
    const connection = em.getConnection();

    this.logger.log('Starting state population from profiles...');

    // Update state_code from profiles for all results that have a linked competitor
    const result = await connection.execute(`
      UPDATE competition_results cr
      SET state_code = p.state
      FROM profiles p
      WHERE cr.competitor_id = p.id
        AND cr.state_code IS NULL
        AND p.state IS NOT NULL
    `);

    const updated = result?.rowCount || result?.affectedRows || 0;
    this.logger.log(`Populated state_code for ${updated} results`);

    return { updated };
  }

  /**
   * Update points for all results in an event
   * This is the main entry point for recalculating points
   */
  async updateEventPoints(eventId: string): Promise<void> {
    this.logger.log(`[updateEventPoints] Starting for event ${eventId}`);
    const em = this.em.fork();
    const connection = em.getConnection();

    // Step 1: Fetch the event with its multiplier using raw SQL
    let multiplier = 2;
    let seasonId: string | null = null;
    try {
      const eventRows = await connection.execute(
        `SELECT id, points_multiplier, season_id FROM events WHERE id = ?`, [eventId]
      );
      if (!eventRows || eventRows.length === 0) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }
      const eventData = eventRows[0];
      multiplier = Number(eventData.points_multiplier) || 2;
      seasonId = eventData.season_id;
      this.logger.log(`[updateEventPoints] Step 1 OK - multiplier=${multiplier}, seasonId=${seasonId}`);
    } catch (sqlError: any) {
      // If the raw SQL fails (e.g., missing column), try a simpler query
      this.logger.warn(`[updateEventPoints] Step 1 raw SQL failed: ${sqlError.message}`);
      try {
        const eventRows = await connection.execute(
          `SELECT id, season_id FROM events WHERE id = ?`, [eventId]
        );
        if (!eventRows || eventRows.length === 0) {
          throw new NotFoundException(`Event with ID ${eventId} not found`);
        }
        seasonId = eventRows[0].season_id;
        this.logger.log(`[updateEventPoints] Step 1 fallback OK - using default multiplier=${multiplier}, seasonId=${seasonId}`);
      } catch (fallbackError: any) {
        this.logger.error(`[updateEventPoints] Step 1 fallback also failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    }

    // Step 2: Fetch points configuration
    let pointsConfig: PointsConfiguration | null = null;
    try {
      if (seasonId) {
        pointsConfig = await this.pointsConfigService.getConfigForSeason(seasonId);
      } else {
        pointsConfig = await this.pointsConfigService.getConfigForCurrentSeason();
      }
      this.logger.log(`[updateEventPoints] Step 2 OK - pointsConfig=${pointsConfig ? 'found' : 'null'}`);
    } catch (configError) {
      this.logger.warn(`[updateEventPoints] Step 2 failed to fetch points config: ${configError}`);
    }

    if (!pointsConfig) {
      this.logger.warn(`[updateEventPoints] No points config for event ${eventId}, points will not be awarded`);
    }

    // Step 3: Fetch all results for this event
    this.logger.log(`[updateEventPoints] Step 3 - fetching results...`);
    const results = await em.find(
      CompetitionResult,
      { event: eventId },
      {
        populate: ['competitor'],
      }
    );
    this.logger.log(`[updateEventPoints] Step 3 OK - found ${results.length} results`);

    // Step 4: Get competition classes
    const classIds = [...new Set(results.map(r => r.classId).filter((id): id is string => Boolean(id)))];
    let classMap = new Map<string, CompetitionClass>();
    try {
      const classes = await em.find(CompetitionClass, { id: { $in: classIds } });
      classMap = new Map(classes.map(c => [c.id, c]));
      this.logger.log(`[updateEventPoints] Step 4 OK - found ${classes.length} classes`);
    } catch (classError) {
      this.logger.warn(`[updateEventPoints] Step 4 failed to fetch classes: ${classError}`);
    }

    // Group results by class and format for placement calculation
    // Note: ALL results get placements, but only eligible formats get points
    const groupedResults = new Map<string, { results: CompetitionResult[]; format: string | null; isEligible: boolean }>();

    for (const result of results) {
      // Skip rows awaiting admin class review — they have no confirmed
      // class, so they must not earn points or influence anyone else's
      // placement until an admin resolves them. Points are recomputed for
      // the event once the row is approved (see resolvePendingResult).
      if ((result as any).needsClassReview) continue;

      // Get format from class if available, otherwise from result.format field
      let format: string | null = result.format || null;
      const competitionClass = classMap.get(result.classId || '');
      if (competitionClass) {
        format = competitionClass.format;
      }

      // Determine if this format is eligible for points
      const isEligible = format ? this.isFormatEligible(format) : false;

      // Group by format+class if format exists, otherwise just by class
      // This ensures all results get placements within their class
      const key = format ? `${format}-${result.competitionClass}` : `UNKNOWN-${result.competitionClass}`;
      if (!groupedResults.has(key)) {
        groupedResults.set(key, { results: [], format, isEligible });
      }
      groupedResults.get(key)!.results.push(result);
    }

    this.logger.log(`[updateEventPoints] Step 5 OK - grouped into ${groupedResults.size} groups`);

    // Step 6: Refresh the points-eligible MECA IDs cache before processing
    try {
      await this.refreshPointsEligibleCache();
      this.logger.log(`[updateEventPoints] Step 6 OK - cache refreshed`);
    } catch (cacheError) {
      this.logger.warn(`[updateEventPoints] Step 6 failed to refresh cache: ${cacheError}`);
    }

    // Step 7: Process each group - assign placements and calculate points
    for (const [key, group] of groupedResults) {
      const { results: groupResults, format, isEligible: isFormatEligible } = group;

      // Sort by score (descending - higher score is better)
      // Note: score is type 'decimal' which PostgreSQL returns as strings, so use Number() conversion
      groupResults.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

      // Assign placement and calculate points
      let currentPlacement = 1;
      for (const result of groupResults) {
        result.placement = currentPlacement;

        // Only calculate points if the format is eligible for points
        if (isFormatEligible && format) {
          // Get MECA ID from result (now stored directly on competition result)
          const mecaId = result.mecaId;

          // Check eligibility using the new membership-based system
          // Points are only awarded to MECA IDs from active Competitor, Retailer, or Manufacturer memberships
          const isMemberEligible = await this.isMemberEligibleAsync(mecaId);

          if (isMemberEligible && pointsConfig) {
            result.pointsEarned = this.calculatePoints(
              currentPlacement,
              multiplier,
              format,
              pointsConfig
            );
          } else {
            // Check if this member is in grace period — hold results for potential renewal
            const inGracePeriod = await this.isInGracePeriod(mecaId);
            if (inGracePeriod) {
              result.pointsHeldForRenewal = true;
              result.heldAt = new Date();
              // Calculate what points WOULD be earned (stored as 0 until released)
              result.pointsEarned = 0;
              result.notes = (result.notes ? result.notes + ' | ' : '') + 'Held: membership expired, within grace period';
            } else {
              result.pointsEarned = 0;
            }
          }
        } else {
          // Format not eligible for points (unknown format or non-points format)
          result.pointsEarned = 0;
        }

        currentPlacement++;
      }
    }

    // Step 8: Persist all changes
    this.logger.log(`[updateEventPoints] Step 8 - flushing changes...`);
    await em.flush();
    this.logger.log(`[updateEventPoints] Step 8 OK - changes persisted`);

    // Step 9: Check World Finals qualifications for all affected competitors
    // Tracked per MECA ID + class combination (a competitor can qualify in multiple classes)
    // Wrapped in try/catch so it doesn't break the points update if World Finals has issues
    if (this.worldFinalsService && seasonId) {
      try {
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
              seasonId,
              result.competitionClass,
            );
          }
        }
      } catch (wfError) {
        this.logger.warn(`Failed to check World Finals qualifications for event ${eventId}, continuing: ${wfError}`);
      }
    }

    // Step 10: Check achievements for all results with linked competitors
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

    this.logger.log(`[updateEventPoints] Complete for event ${eventId}`);
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
   * One-shot backfill: walk every CompetitionResult that has a
   * class_id linked and correct its `format` / `competition_class`
   * text fields to match the linked class's values. Cleans up the
   * legacy rows where the old "default missing format to SPL" path
   * silently mis-tagged SQ / DD / etc. results.
   *
   * Idempotent — already-correct rows are skipped, so re-running has
   * zero effect. Safe to run in production any time.
   */
  async backfillFormatFromClass(): Promise<{
    scanned: number;
    formatFixed: number;
    classNameFixed: number;
    skippedNoClass: number;
  }> {
    const em = this.em.fork();
    let scanned = 0;
    let formatFixed = 0;
    let classNameFixed = 0;
    let skippedNoClass = 0;

    // Pull every result with a class_id set, populating the class so we
    // have its format + name in one go. Process in batches so this can
    // handle a large table without blowing memory.
    const BATCH = 500;
    let offset = 0;
    while (true) {
      const batch = await em.find(
        CompetitionResult,
        { competitionClassEntity: { $ne: null } as any },
        { populate: ['competitionClassEntity'], limit: BATCH, offset, orderBy: { id: 'ASC' } },
      );
      if (batch.length === 0) break;
      for (const r of batch) {
        scanned++;
        const cls = r.competitionClassEntity as any;
        if (!cls || !cls.format || !cls.name) {
          skippedNoClass++;
          continue;
        }
        let changed = false;
        if (r.format !== cls.format) {
          r.format = cls.format;
          formatFixed++;
          changed = true;
        }
        if (r.competitionClass !== cls.name) {
          r.competitionClass = cls.name;
          classNameFixed++;
          changed = true;
        }
        if (changed) {
          em.persist(r);
        }
      }
      await em.flush();
      em.clear();
      if (batch.length < BATCH) break;
      offset += BATCH;
    }

    return { scanned, formatFixed, classNameFixed, skippedNoClass };
  }

  /**
   * Find every result that the public results pages can't render —
   * either class_id is null, points to a deleted class, points to an
   * inactive class, AND the text fallback (competition_class + format
   * vs class.name/.abbreviation + .format, case-insensitive) doesn't
   * match an active class either.
   *
   * Used by /admin/results-needing-class to give admins a queue they
   * can work through instead of those results silently dropping out
   * of public display.
   */
  async findOrphanResults(): Promise<Array<{
    id: string;
    eventId: string | null;
    eventTitle: string | null;
    eventDate: string | null;
    competitorName: string | null;
    mecaId: string | null;
    competitionClass: string;
    format: string | null;
    classId: string | null;
    score: number | null;
    placement: number | null;
    createdAt: string;
    /** Best-effort suggestion: an active class whose name OR
     *  abbreviation matches the result's competition_class text
     *  (and format if both sides are set). Null if no candidate. */
    suggestedClass: { id: string; name: string; abbreviation: string; format: string; isActive: boolean } | null;
    /** The class the row's class_id actually points to right now, if
     *  any. Will commonly be an inactive or otherwise-unusable class
     *  (that's WHY the row is orphan). Helps admins recognise rows
     *  that were imported under an old class name that's since been
     *  deleted or renamed. Null when class_id is null or dangling. */
    linkedClass: { id: string; name: string; abbreviation: string; format: string; isActive: boolean } | null;
    /** Active class_name_mapping whose source_name matches the row's
     *  competition_class text. If `target_class_id` resolves to an
     *  active class, admin can apply the mapping in one click. */
    mappingMatch: {
      mappingId: string;
      sourceName: string;
      targetClass: { id: string; name: string; abbreviation: string; format: string; isActive: boolean } | null;
    } | null;
  }>> {
    const em = this.em.fork();
    const allClasses = await em.find(CompetitionClass, {});
    const classById = new Map(allClasses.map(c => [c.id, c]));
    const mappings = await em.find(ClassNameMapping, { isActive: true });
    const mappingBySource = new Map<string, ClassNameMapping>();
    for (const m of mappings) {
      const key = (m.sourceName || '').trim().toLowerCase();
      if (key) mappingBySource.set(key, m);
    }

    // Tolerant text matcher — same algorithm the frontend uses.
    const norm = (v: unknown): string => String(v ?? '').trim().toLowerCase();
    const matchByText = (className: string, format: string | null | undefined) => {
      const n = norm(className);
      if (!n) return undefined;
      const f = norm(format);
      return allClasses.find(c => {
        if (!c.isActive) return false;
        if (f && norm(c.format) !== f) return false;
        return norm(c.name) === n || norm(c.abbreviation) === n;
      });
    };

    const results = await em.find(
      CompetitionResult,
      {},
      { populate: ['event'], orderBy: { createdAt: 'DESC' } },
    );

    const orphans: any[] = [];
    for (const r of results) {
      // Rows explicitly flagged for admin class review live in the
      // dedicated "Pending Results" queue, not this legacy orphan-cleanup
      // list — keep the two concerns separate.
      if ((r as any).needsClassReview) continue;
      const cid = (r as any).competitionClassEntity?.id || null;
      const linked = cid ? classById.get(cid) : undefined;
      // Resolved if linked class exists AND is active.
      if (linked && linked.isActive) continue;
      // Text fallback against active classes.
      const suggested = matchByText(r.competitionClass, r.format);
      if (suggested) continue; // Public pages will resolve it; not orphan.
      // What does the dangling class_id actually point to? Almost
      // always an inactive or rename-victim class — surfacing it to
      // admins makes the "wait why does this say DDM here but Park
      // and Pound on the result page" mystery obvious at a glance.
      const linkedClassInfo = linked
        ? {
            id: linked.id,
            name: linked.name,
            abbreviation: linked.abbreviation,
            format: linked.format,
            isActive: linked.isActive,
          }
        : null;

      // Active class_name_mapping (CSV-import resolver) whose
      // source_name matches the row's competition_class text. If
      // present, the admin can repoint to whatever target the
      // mapping already specifies in one click.
      const mappingHit = mappingBySource.get(norm(r.competitionClass));
      const mappingMatch = mappingHit
        ? {
            mappingId: mappingHit.id,
            sourceName: mappingHit.sourceName,
            targetClass: (() => {
              const t = mappingHit.targetClassId ? classById.get(mappingHit.targetClassId) : undefined;
              if (!t) return null;
              return {
                id: t.id,
                name: t.name,
                abbreviation: t.abbreviation,
                format: t.format,
                isActive: t.isActive,
              };
            })(),
          }
        : null;

      orphans.push({
        id: r.id,
        eventId: (r as any).event?.id ?? null,
        eventTitle: (r as any).event?.title ?? null,
        eventDate: (r as any).event?.eventDate?.toISOString?.() ?? null,
        competitorName: r.competitorName,
        mecaId: r.mecaId,
        competitionClass: r.competitionClass,
        format: r.format,
        classId: cid,
        score: r.score == null ? null : Number(r.score),
        placement: r.placement,
        createdAt: r.createdAt.toISOString(),
        // Suggestion: even though public lookup couldn't fully match,
        // we may still have a near-miss (e.g. matched name but wrong
        // format) admins can use as a shortcut.
        suggestedClass: (() => {
          const n = norm(r.competitionClass);
          if (!n) return null;
          const near = allClasses.find(c =>
            norm(c.name) === n || norm(c.abbreviation) === n,
          );
          if (!near) return null;
          return {
            id: near.id,
            name: near.name,
            abbreviation: near.abbreviation,
            format: near.format,
            isActive: near.isActive,
          };
        })(),
        linkedClass: linkedClassInfo,
        mappingMatch,
      });
    }
    return orphans;
  }

  /**
   * Bulk repoint a set of result rows to a specific class. Sets the
   * competitionClassEntity FK and lets the entity's downstream
   * triggers (or, more reliably, the next update() / leaderboard
   * recompute) pick up the new class. Returns the count updated.
   */
  async repointResultsToClass(resultIds: string[], classId: string): Promise<{ updated: number }> {
    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return { updated: 0 };
    }
    const em = this.em.fork();
    const targetClass = await em.findOne(CompetitionClass, { id: classId });
    if (!targetClass) {
      throw new NotFoundException(`Target class ${classId} not found`);
    }
    const rows = await em.find(CompetitionResult, { id: { $in: resultIds } });
    let updated = 0;
    for (const r of rows) {
      (r as any).competitionClassEntity = targetClass;
      // Also sync the text fields so the resolver doesn't have to
      // text-fallback for these from now on.
      r.format = targetClass.format;
      r.competitionClass = targetClass.name;
      // Now that the row has a confirmed class, it's no longer pending
      // admin review.
      (r as any).needsClassReview = false;
      updated++;
    }
    await em.flush();
    return { updated };
  }

  // ==========================================================================
  // Pending Class Review (admin queue)
  // ==========================================================================

  /**
   * The admin "Pending Results" queue: every result an Event Director
   * submitted whose class didn't match the system and that was sent for
   * review (needs_class_review = true). For each row we attach a best-effort
   * suggested class (an active class whose name/abbreviation matches the
   * entered text, preferring the ED-selected format) so the admin can assign
   * in one click. EDs can never create classes — this queue is where an
   * admin either creates the class + accepts, or assigns an existing class.
   */
  async findPendingClassReview(): Promise<Array<{
    id: string;
    eventId: string | null;
    eventTitle: string | null;
    eventDate: string | null;
    seasonId: string | null;
    competitorName: string | null;
    mecaId: string | null;
    competitionClass: string;
    format: string | null;
    score: number | null;
    placement: number | null;
    createdAt: string;
    suggestedClass: { id: string; name: string; abbreviation: string; format: string } | null;
  }>> {
    const em = this.em.fork();
    const activeClasses = await em.find(CompetitionClass, { isActive: true });
    const norm = (v: unknown): string => String(v ?? '').trim().toLowerCase();

    const results = await em.find(
      CompetitionResult,
      { needsClassReview: true },
      // Populate event.season too — ED manual entries don't carry a direct
      // season_id, so we fall back to the event's season for the seasonId
      // the admin needs to create-class-and-accept.
      { populate: ['event', 'event.season', 'season'], orderBy: { createdAt: 'DESC' } },
    );

    return results.map((r) => {
      const n = norm(r.competitionClass);
      const f = norm(r.format);
      // Prefer a same-format name/abbreviation match; fall back to any
      // name/abbreviation match regardless of format.
      const suggested =
        (n
          ? activeClasses.find(
              (c) => (norm(c.name) === n || norm(c.abbreviation) === n) && (!f || norm(c.format) === f),
            ) || activeClasses.find((c) => norm(c.name) === n || norm(c.abbreviation) === n)
          : undefined) || null;

      return {
        id: r.id,
        eventId: (r as any).event?.id ?? null,
        eventTitle: (r as any).event?.title ?? null,
        eventDate: (r as any).event?.eventDate?.toISOString?.() ?? null,
        seasonId: (r as any).season?.id ?? (r as any).event?.season?.id ?? null,
        competitorName: r.competitorName,
        mecaId: r.mecaId ?? null,
        competitionClass: r.competitionClass,
        format: r.format ?? null,
        score: r.score == null ? null : Number(r.score),
        placement: r.placement,
        createdAt: r.createdAt.toISOString(),
        suggestedClass: suggested
          ? {
              id: suggested.id,
              name: suggested.name,
              abbreviation: suggested.abbreviation,
              format: suggested.format,
            }
          : null,
      };
    });
  }

  /**
   * Admin action: assign pending result(s) to an EXISTING class. Repoints the
   * rows (which clears needs_class_review) and recalculates points for the
   * affected events so the now-accepted results earn their points.
   */
  async resolvePendingResult(resultIds: string[], classId: string): Promise<{ updated: number }> {
    const { updated } = await this.repointResultsToClass(resultIds, classId);
    await this.recalcEventsForResults(resultIds);
    return { updated };
  }

  /**
   * Admin action: create a NEW class and accept the pending result(s) into it.
   * Idempotent on (season, format, name/abbreviation) so re-submitting reuses
   * an existing match rather than creating a duplicate. Recalculates points
   * for the affected events afterward.
   */
  async createClassAndAcceptPending(params: {
    resultIds: string[];
    name: string;
    abbreviation?: string;
    format: string;
    seasonId: string;
  }): Promise<{ classId: string; updated: number }> {
    const { resultIds, name, format, seasonId } = params;
    const abbreviation = params.abbreviation || params.name;
    if (!name || !format || !seasonId) {
      throw new BadRequestException('name, format and seasonId are required.');
    }

    const em = this.em.fork();
    const season = await em.findOne(Season, { id: seasonId });
    if (!season) {
      throw new NotFoundException(`Season ${seasonId} not found`);
    }

    const norm = (v: unknown): string => String(v ?? '').trim().toLowerCase();
    const existing = (await em.find(CompetitionClass, { seasonId })).find(
      (c) =>
        norm(c.format) === norm(format) &&
        (norm(c.name) === norm(name) || norm(c.abbreviation) === norm(abbreviation)),
    );

    let classId: string;
    if (existing) {
      classId = existing.id;
    } else {
      const cls = em.create(CompetitionClass, {
        name,
        abbreviation,
        format,
        section: null,
        season,
        isActive: true,
        displayOrder: 0,
        unlimitedWattage: false,
      } as any);
      await em.persistAndFlush(cls);
      classId = cls.id;
    }

    const { updated } = await this.repointResultsToClass(resultIds, classId);
    await this.recalcEventsForResults(resultIds);
    return { classId, updated };
  }

  /**
   * Recalculate event points for every event referenced by the given result
   * IDs. Used after a pending result is accepted so the newly-classed rows
   * (and everyone they now share a class with) get correct placements/points.
   */
  private async recalcEventsForResults(resultIds: string[]): Promise<void> {
    if (!Array.isArray(resultIds) || resultIds.length === 0) return;
    const em = this.em.fork();
    const rows = await em.find(CompetitionResult, { id: { $in: resultIds } }, { populate: ['event'] });
    const eventIds = [...new Set(rows.map((r) => (r as any).event?.id).filter(Boolean))];
    for (const eventId of eventIds) {
      try {
        await this.updateEventPoints(eventId);
      } catch (e: any) {
        this.logger.warn(`Points recalc failed for event ${eventId} after pending accept: ${e.message}`);
      }
    }
  }

  /**
   * Check if wattage/frequency is required for a given format and class
   * Required for all SPL classes except Dueling Demos
   */
  private isWattageFrequencyRequired(format: string, className: string, unlimitedWattage?: boolean): boolean {
    if (!format || format.toUpperCase() !== 'SPL') return false;
    // Unlimited wattage classes don't require wattage/frequency entry
    if (unlimitedWattage) return false;
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
      // Set when the parsed row's class name doesn't match any existing
      // competition_classes row. Frontend uses this to drive the
      // "Unknown Classes" section of the import review modal.
      unknownClass?: string;
    }>;
    totalCount: number;
    needsNameConfirmation: number;
    needsDataCompletion: number;
    // De-duped list of class names from the file that don't exist in
    // competition_classes yet. The admin/ED must create each before the
    // import can proceed (so the class becomes available system-wide
    // for every future import + every future manual entry).
    unknownClasses: string[];
  }> {
    const em = this.em.fork();
    const today = new Date();

    // Fetch competition classes to check unlimited_wattage flag
    const competitionClasses = await em.find(CompetitionClass, {});

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
      unknownClass?: string;
    }> = [];

    let needsNameConfirmation = 0;
    let needsDataCompletion = 0;
    // De-duped set of class names that need to be created. Map key is
    // a case-insensitive normalized name so "Park And Pound 7" and
    // "park and pound 7" collapse to one prompt; value is the first
    // raw spelling we saw so the UI shows it back exactly as typed.
    const unknownClassMap = new Map<string, string>();

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

      // Class is the source of truth for format. Look it up in
      // competition_classes by name or abbreviation. If we find a
      // match we copy its format onto the parsed row so create() never
      // has to guess. If we DON'T find a match the row is flagged as
      // unknownClass — the import preview modal shows a "create this
      // class" prompt to the admin/ED, who picks the format and saves
      // it to the system so every future import + manual entry can
      // use it.
      const matchedClass = competitionClasses.find(
        c => c.name.toLowerCase() === (result.class || '').toLowerCase() ||
             c.abbreviation.toLowerCase() === (result.class || '').toLowerCase()
      );
      let unknownClassName: string | undefined = undefined;
      if (!matchedClass && result.class && String(result.class).trim() !== '') {
        const trimmed: string = String(result.class).trim();
        unknownClassName = trimmed;
        const key = trimmed.toLowerCase();
        if (!unknownClassMap.has(key)) {
          unknownClassMap.set(key, trimmed);
        }
      }
      const format = matchedClass?.format || result.format || null;
      // Carry the inferred format onto the row so the eventual
      // create() call has it. (create() itself re-derives from class
      // when class_id is set, but this still helps the resolution
      // path that maps classes via name when the import is finalized.)
      if (matchedClass && !result.format) {
        result.format = matchedClass.format;
      }
      const isUnlimited = matchedClass?.unlimitedWattage || result.wattage === -1;
      // Only enforce wattage/frequency when we KNOW the format is SPL
      // via the matched class. No more "default to SPL and demand
      // wattage" — that was the SQ / DD import bug.
      if (matchedClass && this.isWattageFrequencyRequired(matchedClass.format, result.class, isUnlimited)) {
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
        unknownClass: unknownClassName,
      });
    }

    return {
      results,
      totalCount: parsedResults.length,
      needsNameConfirmation,
      needsDataCompletion,
      unknownClasses: Array.from(unknownClassMap.values()),
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
