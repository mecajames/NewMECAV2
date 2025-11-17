import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { CompetitionResult } from './competition-results.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';
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
    return em.find(CompetitionResult, { eventId }, {
      orderBy: { placement: 'ASC' },
      populate: ['competitor'],
    });
  }

  async findByCompetitor(competitorId: string): Promise<CompetitionResult[]> {
    const em = this.em.fork();
    return em.find(CompetitionResult, { competitorId });
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

    // Log to audit if there's an active session or userId provided
    if (this.currentSessionId && userId) {
      await this.auditService.logAction({
        sessionId: this.currentSessionId,
        resultId: result.id,
        action: 'create',
        newData: JSON.parse(JSON.stringify(result)),
        userId,
      });

      // Track manual entries for Excel generation
      this.manualEntryResults.push(result);
    }

    return result;
  }

  async update(id: string, data: Partial<CompetitionResult>, userId?: string): Promise<CompetitionResult> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id }, { populate: ['event'] });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }

    // Capture old data for audit log
    const oldData = { ...result };

    // Capture event_id for points recalculation
    const eventId = (data as any).event_id || result.eventId;

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

    // Track audit trail for updates
    if ((data as any).updated_by !== undefined) {
      transformedData.updatedBy = (data as any).updated_by;
      delete transformedData.updated_by;
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
    if (userId) {
      await this.auditService.logAction({
        sessionId: this.currentSessionId ?? undefined,
        resultId: result.id,
        action: 'update',
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: JSON.parse(JSON.stringify(result)),
        userId,
      });
    }

    return result;
  }

  async delete(id: string, userId?: string): Promise<void> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }

    // Capture old data for audit log before deletion
    const oldData = { ...result };

    await em.removeAndFlush(result);

    // Log to audit if userId is provided
    if (userId) {
      // TODO: Fix audit logging - temporarily disabled
      // await this.auditService.logAction({
      //   sessionId: this.currentSessionId ?? undefined,
      //   resultId: id,
      //   action: 'delete',
      //   oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      //   newData: null,
      //   userId,
      // });
    }
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
    const event = await em.findOne(Event, { id: eventId });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    const eventSeasonId = event.seasonId || null;

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
        let classId: string | null = null;
        if (result.class && result.format) {
          const foundClass = competitionClasses.find(
            c => c.name === result.class && c.format === result.format
          );
          if (foundClass) {
            classId = foundClass.id;
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
}
