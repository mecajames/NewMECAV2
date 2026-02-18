import { Injectable, Inject } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { ResultsEntrySession } from './results-entry-session.entity';
import { ResultsAuditLog } from './results-audit-log.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as XLSX from 'xlsx';

@Injectable()
export class AuditService {
  constructor(@Inject('EntityManager') private readonly em: EntityManager) {}

  /**
   * Create a new entry session
   */
  async createSession(data: {
    eventId: string;
    userId: string;
    entryMethod: 'manual' | 'excel' | 'termlab';
    format?: string;
    filePath?: string;
    originalFilename?: string;
  }): Promise<ResultsEntrySession> {
    const em = this.em.fork();
    const session = em.create(ResultsEntrySession, {
      eventId: data.eventId,
      userId: data.userId,
      event: Reference.createFromPK(Event, data.eventId) as any,
      user: Reference.createFromPK(Profile, data.userId) as any,
      entryMethod: data.entryMethod,
      format: data.format,
      filePath: data.filePath,
      originalFilename: data.originalFilename,
      sessionStart: new Date(),
      resultCount: 0,
      createdAt: new Date(),
    });

    await em.persistAndFlush(session);
    return session;
  }

  /**
   * End a session and update result count
   */
  async endSession(sessionId: string, resultCount: number): Promise<void> {
    console.log(`[AUDIT] Ending session ${sessionId} with result count: ${resultCount}`);
    const em = this.em.fork();
    const session = await em.findOne(ResultsEntrySession, { id: sessionId });

    if (session) {
      console.log(`[AUDIT] Found session, current resultCount: ${session.resultCount}`);
      em.assign(session, {
        sessionEnd: new Date(),
        resultCount: resultCount,
      });
      console.log(`[AUDIT] After assign, resultCount: ${session.resultCount}`);
      await em.flush();
      console.log(`[AUDIT] Session updated successfully`);
    } else {
      console.log(`[AUDIT] Session not found: ${sessionId}`);
    }
  }

  /**
   * Update session file path after saving file
   */
  async updateSessionFilePath(sessionId: string, filePath: string): Promise<void> {
    const em = this.em.fork();
    const session = await em.findOne(ResultsEntrySession, { id: sessionId });

    if (session) {
      em.assign(session, { filePath });
      await em.flush();
    }
  }

  /**
   * Log an audit entry
   */
  async logAction(data: {
    sessionId?: string;
    resultId?: string;
    action: 'create' | 'update' | 'delete';
    oldData?: any;
    newData?: any;
    userId: string;
    ipAddress?: string;
  }): Promise<void> {
    console.log(`[AUDIT] logAction called - action: ${data.action}, resultId: ${data.resultId}, sessionId: ${data.sessionId}, userId: ${data.userId}`);
    console.log(`[AUDIT] oldData event_id: ${data.oldData?.event_id}, eventId: ${data.oldData?.eventId}`);

    const em = this.em.fork();

    // Build the log entry - use relations since virtual properties have persist: false
    const logData: any = {
      action: data.action,
      oldData: data.oldData || null,
      newData: data.newData || null,
      timestamp: new Date(),
    };

    // Set session relation using Reference if sessionId is provided
    if (data.sessionId) {
      logData.session = Reference.createFromPK(ResultsEntrySession, data.sessionId);
    }

    // Set result relation using Reference if resultId is provided
    if (data.resultId) {
      const { CompetitionResult } = await import('../competition-results/competition-results.entity');
      logData.result = Reference.createFromPK(CompetitionResult, data.resultId);
    }

    // Set user relation using Reference
    if (data.userId) {
      logData.user = Reference.createFromPK(Profile, data.userId);
    }

    const log = em.create(ResultsAuditLog, logData);

    await em.persistAndFlush(log);
    console.log(`[AUDIT] Log entry created with id: ${log.id}, session_id: ${data.sessionId}`);
  }

  /**
   * Save uploaded file to audit directory
   */
  async saveUploadedFile(
    file: Express.Multer.File,
    eventId: string,
    sessionId: string
  ): Promise<string> {
    const auditDir = path.join(process.cwd(), 'audit-logs', 'uploads', eventId);

    // Create directory if it doesn't exist
    await fs.mkdir(auditDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    const filename = `${sessionId}_${timestamp}${ext}`;
    const filePath = path.join(auditDir, filename);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    return filePath;
  }

  /**
   * Generate Excel file for manual entries
   */
  async generateManualEntriesExcel(
    eventId: string,
    sessionId: string,
    results: any[]
  ): Promise<string> {
    const auditDir = path.join(process.cwd(), 'audit-logs', 'sessions', eventId);

    // Create directory if it doesn't exist
    await fs.mkdir(auditDir, { recursive: true });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Convert results to worksheet format
    const wsData = [
      ['Member ID', 'Name', 'Class', 'Format', 'Score', 'Placement', 'Points', 'Wattage', 'Frequency', 'Vehicle Info', 'Notes'],
      ...results.map(r => [
        r.meca_id || r.mecaId || '',
        r.competitor_name || r.competitorName || '',
        r.competition_class || r.competitionClass || '',
        r.format || '',
        r.score || '',
        r.placement || '',
        r.points_earned || r.pointsEarned || '',
        r.wattage || '',
        r.frequency || '',
        r.vehicle_info || r.vehicleInfo || '',
        r.notes || '',
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Manual Entries');

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `manual_${sessionId}_${timestamp}.xlsx`;
    const filePath = path.join(auditDir, filename);

    // Write file
    XLSX.writeFile(wb, filePath);

    return filePath;
  }

  /**
   * Get sessions for an event (with result details)
   */
  async getEventSessions(eventId: string): Promise<any[]> {
    const em = this.em.fork();

    try {
      const sessions = await em.find(
        ResultsEntrySession,
        { event: eventId },
        {
          populate: ['user'],
          orderBy: { sessionStart: 'DESC' },
        }
      );

      // For each session, fetch the associated audit log entries to get result details
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const sessionData: any = {
            id: session.id,
            eventId: eventId, // Use parameter since session.eventId may not be populated
            userId: session.userId || (session.user as any)?.id,
            user: session.user ? {
              id: session.user.id,
              email: session.user.email,
              first_name: session.user.first_name,
              last_name: session.user.last_name,
            } : null,
            entryMethod: session.entryMethod,
            format: session.format,
            filePath: session.filePath,
            originalFilename: session.originalFilename,
            resultCount: session.resultCount,
            sessionStart: session.sessionStart,
            sessionEnd: session.sessionEnd,
            createdAt: session.createdAt,
            entries: [],
          };

          try {
            // Fetch audit log entries for this session using MikroORM
            const auditLogs = await em.find(
              ResultsAuditLog,
              { session: session.id, action: 'create' },
              { orderBy: { timestamp: 'ASC' } }
            );

            // Extract competitor info from audit logs
            const entryMecaIds: string[] = [];
            const rawEntries = auditLogs.map((log) => {
              const data = log.newData || {};
              const mecaId = data.mecaId || data.meca_id || null;
              if (mecaId) entryMecaIds.push(String(mecaId));
              return {
                id: log.id,
                competitorName: data.competitorName || data.competitor_name || 'Unknown',
                competitionClass: data.competitionClass || data.competition_class || 'N/A',
                format: data.format || session.format || 'N/A',
                score: data.score ?? 'N/A',
                placement: data.placement ?? 'N/A',
                pointsEarned: data.pointsEarned ?? data.points_earned ?? 0,
                mecaId,
                membershipStatus: 'none' as string,
                timestamp: log.timestamp,
              };
            });

            // Look up membership status for MECA IDs in this session
            if (entryMecaIds.length > 0) {
              const entryProfiles = await em.find(Profile, { meca_id: { $in: entryMecaIds } });
              const statusMap = new Map(entryProfiles.map(p => [String(p.meca_id).trim(), p.membership_status || 'none']));
              for (const entry of rawEntries) {
                if (entry.mecaId) {
                  entry.membershipStatus = statusMap.get(String(entry.mecaId).trim()) || 'none';
                }
              }
            }
            sessionData.entries = rawEntries;
          } catch (err) {
            console.error(`Error fetching entries for session ${session.id}:`, err);
            // Continue without entries if there's an error
          }

          return sessionData;
        })
      );

      return sessionsWithDetails;
    } catch (error) {
      console.error('Error in getEventSessions:', error);
      // Fall back to simple query without entries
      const sessions = await em.find(
        ResultsEntrySession,
        { event: eventId },
        {
          populate: ['user'],
          orderBy: { sessionStart: 'DESC' },
        }
      );
      return sessions;
    }
  }

  /**
   * Get audit logs for a session
   */
  async getSessionAuditLogs(sessionId: string): Promise<ResultsAuditLog[]> {
    const em = this.em.fork();
    return em.find(
      ResultsAuditLog,
      { sessionId },
      {
        orderBy: { timestamp: 'ASC' },
      }
    );
  }

  /**
   * Get file path for a session
   */
  async getSessionFilePath(sessionId: string): Promise<string | null> {
    const em = this.em.fork();
    const session = await em.findOne(ResultsEntrySession, { id: sessionId });
    return session?.filePath || null;
  }

  /**
   * Get all modifications (update actions) for an event
   */
  async getEventModifications(eventId: string): Promise<any[]> {
    console.log(`[AUDIT] getEventModifications called for eventId: ${eventId}`);
    const em = this.em.fork();

    try {
      // Query audit logs where action is 'update' and either oldData or newData contains this event_id
      const logs = await em.find(
        ResultsAuditLog,
        {
          action: 'update',
          $or: [
            { oldData: { event_id: eventId } },
            { newData: { event_id: eventId } },
            { oldData: { eventId: eventId } },
            { newData: { eventId: eventId } },
          ],
        },
        {
          populate: ['user'],
          orderBy: { timestamp: 'DESC' },
        }
      );

      // Map to expected format for frontend
      const results = logs.map(log => ({
        id: log.id,
        session_id: log.session?.id || null,
        result_id: log.result?.id || null,
        action: log.action,
        old_data: log.oldData,
        new_data: log.newData,
        timestamp: log.timestamp,
        user_id: log.user?.id || null,
        user_email: log.user?.email || null,
        user_first_name: log.user?.first_name || null,
        user_last_name: log.user?.last_name || null,
      }));

      console.log(`[AUDIT] getEventModifications found ${results.length} records`);
      return results;
    } catch (error) {
      console.error('Error in getEventModifications:', error);
      return [];
    }
  }

  /**
   * Get all deletions (delete actions) for an event
   */
  async getEventDeletions(eventId: string): Promise<any[]> {
    console.log(`[AUDIT] getEventDeletions called for eventId: ${eventId}`);
    const em = this.em.fork();

    try {
      // Query audit logs where action is 'delete' and oldData contains this event_id
      const logs = await em.find(
        ResultsAuditLog,
        {
          action: 'delete',
          $or: [
            { oldData: { event_id: eventId } },
            { oldData: { eventId: eventId } },
          ],
        },
        {
          populate: ['user'],
          orderBy: { timestamp: 'DESC' },
        }
      );

      // Map to expected format for frontend
      const results = logs.map(log => ({
        id: log.id,
        session_id: log.session?.id || null,
        result_id: log.result?.id || null,
        action: log.action,
        old_data: log.oldData,
        new_data: log.newData,
        timestamp: log.timestamp,
        user_id: log.user?.id || null,
        user_email: log.user?.email || null,
        user_first_name: log.user?.first_name || null,
        user_last_name: log.user?.last_name || null,
      }));

      console.log(`[AUDIT] getEventDeletions found ${results.length} records`);
      return results;
    } catch (error) {
      console.error('Error in getEventDeletions:', error);
      return [];
    }
  }

  /**
   * Get all audit logs for an event (imports, modifications, deletions)
   */
  async getEventAllLogs(eventId: string): Promise<{
    imports: ResultsEntrySession[];
    modifications: any[];
    deletions: any[];
  }> {
    const [imports, modifications, deletions] = await Promise.all([
      this.getEventSessions(eventId),
      this.getEventModifications(eventId),
      this.getEventDeletions(eventId),
    ]);

    return {
      imports,
      modifications,
      deletions,
    };
  }

  /**
   * Get all sessions across all events (admin only)
   */
  async getAllSessions(filters: {
    limit?: number;
    offset?: number;
    eventId?: string;
    search?: string;
  }): Promise<{ sessions: any[]; total: number }> {
    const em = this.em.fork();
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const where: any = {};
    if (filters.eventId) {
      where.event = filters.eventId;
    }

    const [sessions, total] = await em.findAndCount(
      ResultsEntrySession,
      where,
      {
        populate: ['user', 'event'],
        orderBy: { sessionStart: 'DESC' },
        limit,
        offset,
      }
    );

    let mappedSessions = sessions.map((session) => ({
      id: session.id,
      eventId: session.event?.id || session.eventId,
      eventTitle: session.event?.title || 'Unknown Event',
      userId: session.user?.id || session.userId,
      userName: session.user
        ? `${session.user.first_name || ''} ${session.user.last_name || ''}`.trim() || session.user.email
        : 'Unknown',
      userEmail: session.user?.email || null,
      entryMethod: session.entryMethod,
      format: session.format,
      filePath: session.filePath,
      originalFilename: session.originalFilename,
      resultCount: session.resultCount,
      sessionStart: session.sessionStart,
      sessionEnd: session.sessionEnd,
      createdAt: session.createdAt,
    }));

    // Apply search filter in-memory (on user name/email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      mappedSessions = mappedSessions.filter(
        (s) =>
          s.userName?.toLowerCase().includes(searchLower) ||
          s.userEmail?.toLowerCase().includes(searchLower) ||
          s.eventTitle?.toLowerCase().includes(searchLower)
      );
    }

    return { sessions: mappedSessions, total };
  }

  /**
   * Get unified audit activity across all events (admin only)
   * Combines: new entries (sessions), modifications, and deletions
   * Groups same-time modifications/deletions by user+event+timestamp
   */
  async getAllActivity(filters: {
    limit?: number;
    offset?: number;
    seasonId?: string;
    search?: string;
    actionType?: string;
  }): Promise<{ activities: any[]; total: number; stats: { newEntries: number; modifications: number; deletions: number } }> {
    const em = this.em.fork();

    try {
    // If seasonId provided, find all event IDs for that season
    let seasonEventIds: string[] | null = null;
    if (filters.seasonId) {
      const seasonEvents = await em.find(Event, { season: filters.seasonId } as any);
      seasonEventIds = seasonEvents.map(e => e.id);
      if (seasonEventIds.length === 0) {
        return { activities: [], total: 0, stats: { newEntries: 0, modifications: 0, deletions: 0 } };
      }
    }

    // 1. Fetch sessions (new entries)
    const sessionWhere: any = {};
    if (seasonEventIds) {
      sessionWhere.event = { $in: seasonEventIds };
    }

    const sessions = await em.find(
      ResultsEntrySession,
      sessionWhere,
      { populate: ['user', 'event'], orderBy: { sessionStart: 'DESC' } }
    );

    // For each session, try to fetch 'create' audit logs to get competitor names/MECA IDs
    let createLogsBySession = new Map<string, ResultsAuditLog[]>();
    try {
      const sessionIds = sessions.map(s => s.id);
      if (sessionIds.length > 0) {
        const createLogs = await em.find(
          ResultsAuditLog,
          { session: { $in: sessionIds }, action: 'create' },
          { orderBy: { timestamp: 'ASC' } }
        );
        for (const log of createLogs) {
          const sid = (log as any).session?.id || (log as any).sessionId;
          if (sid) {
            if (!createLogsBySession.has(sid)) createLogsBySession.set(sid, []);
            createLogsBySession.get(sid)!.push(log);
          }
        }
      }
    } catch (err) {
      console.error('[AUDIT] Error fetching create logs for sessions:', err);
    }

    const sessionActivities = sessions.map((session) => {
      const userName = session.user
        ? `${session.user.first_name || ''} ${session.user.last_name || ''}`.trim() || session.user.email
        : 'Unknown';

      // Extract competitor info from create logs for this session
      const sessionCreateLogs = createLogsBySession.get(session.id) || [];
      const competitorNames: string[] = [];
      const competitorDetails: any[] = [];
      for (const log of sessionCreateLogs) {
        const d = log.newData || {};
        const name = d.competitorName || d.competitor_name || null;
        if (name && !competitorNames.includes(name)) {
          competitorNames.push(name);
        }
        competitorDetails.push({
          id: log.id,
          competitorName: name || 'Unknown',
          mecaId: d.mecaId || d.meca_id || null,
          competitionClass: d.competitionClass || d.competition_class || null,
          format: d.format || null,
          score: d.score ?? null,
          oldData: null,
          newData: d,
        });
      }

      return {
        id: session.id,
        sourceType: 'session' as const,
        actionType: 'new_entry' as const,
        date: session.sessionStart,
        eventId: session.event?.id || session.eventId,
        eventTitle: session.event?.title || 'Unknown Event',
        eventDate: (session.event as any)?.eventDate || null,
        seasonId: (session.event as any)?.season_id || null,
        seasonName: null as string | null,
        userId: session.user?.id || session.userId,
        userName,
        userEmail: session.user?.email || null,
        entryMethod: session.entryMethod,
        format: session.format,
        resultCount: session.resultCount,
        filePath: session.filePath,
        originalFilename: session.originalFilename,
        sessionId: session.id,
        competitorNames,
        competitorDetails,
        competitionClass: null as string | null,
        oldData: null as any,
        newData: null as any,
        groupedLogs: null as any[] | null,
      };
    });

    // 2. Fetch modifications and deletions (no session populate - it can fail if sessions were deleted)
    const auditLogs = await em.find(
      ResultsAuditLog,
      { action: { $in: ['update', 'delete'] } },
      { populate: ['user'], orderBy: { timestamp: 'DESC' } }
    );

    // Group audit logs by user + event + action + close timestamps (within 5 seconds)
    const groupedLogMap = new Map<string, typeof auditLogs>();
    for (const log of auditLogs) {
      const data = log.oldData || log.newData || {};
      const eventId = data.event_id || data.eventId || null;
      const userId = log.user?.id || 'unknown';
      const ts = new Date(log.timestamp).getTime();
      const timeBucket = Math.floor(ts / 5000); // 5-second windows
      const key = `${userId}|${eventId}|${log.action}|${timeBucket}`;

      if (!groupedLogMap.has(key)) {
        groupedLogMap.set(key, []);
      }
      groupedLogMap.get(key)!.push(log);
    }

    // Build grouped activities from the map
    const logActivities: any[] = [];
    for (const [, logs] of groupedLogMap) {
      const firstLog = logs[0];
      const data = firstLog.oldData || firstLog.newData || {};
      const eventId = data.event_id || data.eventId || null;
      const userName = firstLog.user
        ? `${firstLog.user.first_name || ''} ${firstLog.user.last_name || ''}`.trim() || firstLog.user.email
        : 'Unknown';

      // Collect all competitor names and details from the group
      const competitorNames: string[] = [];
      const competitorDetails: any[] = [];
      for (const log of logs) {
        const d = log.oldData || log.newData || {};
        const name = d.competitorName || d.competitor_name || null;
        if (name && !competitorNames.includes(name)) {
          competitorNames.push(name);
        }
        competitorDetails.push({
          id: log.id,
          competitorName: name || 'Unknown',
          mecaId: d.mecaId || d.meca_id || null,
          competitionClass: d.competitionClass || d.competition_class || null,
          format: d.format || null,
          score: d.score ?? null,
          oldData: log.oldData,
          newData: log.newData,
        });
      }

      // Modifications/deletions done through the UI are always manual edits
      const entryMethod = 'manual';

      logActivities.push({
        id: firstLog.id,
        sourceType: 'audit_log' as const,
        actionType: firstLog.action === 'update' ? 'modification' as const : 'deletion' as const,
        date: firstLog.timestamp,
        eventId,
        eventTitle: null as string | null,
        eventDate: null as string | null,
        seasonId: null as string | null,
        seasonName: null as string | null,
        userId: firstLog.user?.id || null,
        userName,
        userEmail: firstLog.user?.email || null,
        entryMethod,
        format: data.format || null,
        resultCount: logs.length,
        filePath: null,
        originalFilename: null,
        sessionId: null,
        competitorNames,
        competitorDetails,
        competitionClass: data.competitionClass || data.competition_class || null,
        oldData: firstLog.oldData,
        newData: firstLog.newData,
        groupedLogs: logs.length > 1 ? logs.map(l => ({
          id: l.id,
          action: l.action,
          oldData: l.oldData,
          newData: l.newData,
          timestamp: l.timestamp,
        })) : null,
      });
    }

    // Resolve event titles, dates, and season info
    const allEventIds = [...new Set([
      ...logActivities.map((a: any) => a.eventId).filter(Boolean),
      ...sessionActivities.map(a => a.eventId).filter(Boolean),
    ])];
    if (allEventIds.length > 0) {
      try {
        const events = await em.find(Event, { id: { $in: allEventIds } }, { populate: ['season'] as any });
        const eventMap = new Map(events.map(e => [e.id, {
          title: e.title,
          eventDate: e.eventDate,
          seasonId: (e as any).season_id || (e.season as any)?.id,
          seasonName: (e.season as any)?.name || null,
        }]));
        for (const activity of logActivities) {
          if (activity.eventId && eventMap.has(activity.eventId)) {
            const info = eventMap.get(activity.eventId)!;
            activity.eventTitle = info.title;
            activity.eventDate = info.eventDate;
            activity.seasonId = info.seasonId;
            activity.seasonName = info.seasonName;
          }
        }
        for (const activity of sessionActivities) {
          if (activity.eventId && eventMap.has(activity.eventId)) {
            const info = eventMap.get(activity.eventId)!;
            activity.seasonName = info.seasonName;
            if (!activity.eventDate) activity.eventDate = info.eventDate as any;
          }
        }
      } catch (err) {
        console.error('[AUDIT] Error resolving event info:', err);
      }
    }

    // Resolve membership status for all MECA IDs
    const allMecaIds = new Set<string>();
    for (const a of [...sessionActivities, ...logActivities]) {
      for (const d of (a.competitorDetails || [])) {
        if (d.mecaId) allMecaIds.add(String(d.mecaId).trim());
      }
    }
    const mecaStatusMap = new Map<string, string>();
    if (allMecaIds.size > 0) {
      try {
        const mecaIdArray = [...allMecaIds];
        const profiles = await em.find(Profile, { meca_id: { $in: mecaIdArray } });
        for (const p of profiles) {
          if (p.meca_id) {
            mecaStatusMap.set(String(p.meca_id).trim(), p.membership_status || 'none');
          }
        }
      } catch (err) {
        console.error('[AUDIT] Error looking up membership status:', err);
      }
    }
    // Enrich competitor details with membership status
    for (const a of [...sessionActivities, ...logActivities]) {
      for (const d of (a.competitorDetails || [])) {
        if (d.mecaId) {
          const idKey = String(d.mecaId).trim();
          d.membershipStatus = mecaStatusMap.get(idKey) || 'none';
        } else {
          d.membershipStatus = 'none';
        }
      }
    }

    // Filter by season if needed
    let allActivities = [...sessionActivities, ...logActivities];
    if (seasonEventIds) {
      allActivities = allActivities.filter(a => a.eventId && seasonEventIds!.includes(a.eventId));
    }

    // Filter by actionType
    if (filters.actionType && filters.actionType !== 'all') {
      allActivities = allActivities.filter(a => a.actionType === filters.actionType);
    }

    // Enhanced search - searches across many fields
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      allActivities = allActivities.filter(a => {
        // Admin user name/email
        if (a.userName?.toLowerCase().includes(searchLower)) return true;
        if (a.userEmail?.toLowerCase().includes(searchLower)) return true;
        // Event title
        if (a.eventTitle?.toLowerCase().includes(searchLower)) return true;
        // Season name
        if (a.seasonName?.toLowerCase().includes(searchLower)) return true;
        // Competition class
        if (a.competitionClass?.toLowerCase().includes(searchLower)) return true;
        // Format
        if (a.format?.toLowerCase().includes(searchLower)) return true;
        // Competitor names (including within grouped entries)
        if (a.competitorNames?.some((n: string) => n.toLowerCase().includes(searchLower))) return true;
        // Search within competitor details for MECA IDs, classes
        if (a.competitorDetails?.some((d: any) =>
          d.mecaId?.toString().toLowerCase().includes(searchLower) ||
          d.competitorName?.toLowerCase().includes(searchLower) ||
          d.competitionClass?.toLowerCase().includes(searchLower) ||
          d.format?.toLowerCase().includes(searchLower)
        )) return true;
        // Event date (formatted)
        if (a.eventDate) {
          const dateStr = new Date(a.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
          if (dateStr.includes(searchLower)) return true;
        }
        // Activity date
        if (a.date) {
          const dateStr = new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
          if (dateStr.includes(searchLower)) return true;
        }
        return false;
      });
    }

    // Compute stats before pagination
    const stats = {
      newEntries: allActivities.filter(a => a.actionType === 'new_entry').length,
      modifications: allActivities.filter(a => a.actionType === 'modification').length,
      deletions: allActivities.filter(a => a.actionType === 'deletion').length,
    };

    // Sort by date descending
    allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = allActivities.length;

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const paginated = allActivities.slice(offset, offset + limit);

    return { activities: paginated, total, stats };

    } catch (error) {
      console.error('[AUDIT] getAllActivity error:', error);
      throw error;
    }
  }

  /**
   * Get a single audit log with details
   */
  async getAuditLogById(logId: string): Promise<any> {
    const em = this.em.fork();

    const log = await em.findOne(
      ResultsAuditLog,
      { id: logId },
      { populate: ['user'] }
    );

    if (!log) {
      return null;
    }

    return {
      id: log.id,
      session_id: log.session?.id || null,
      result_id: log.result?.id || null,
      action: log.action,
      old_data: log.oldData,
      new_data: log.newData,
      timestamp: log.timestamp,
      user_id: log.user?.id || null,
      user_email: log.user?.email || null,
      user_first_name: log.user?.first_name || null,
      user_last_name: log.user?.last_name || null,
    };
  }
}
