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
            sessionData.entries = auditLogs.map((log) => {
              const data = log.newData || {};
              return {
                id: log.id,
                competitorName: data.competitorName || data.competitor_name || 'Unknown',
                competitionClass: data.competitionClass || data.competition_class || 'N/A',
                format: data.format || session.format || 'N/A',
                score: data.score ?? 'N/A',
                placement: data.placement ?? 'N/A',
                pointsEarned: data.pointsEarned ?? data.points_earned ?? 0,
                mecaId: data.mecaId || data.meca_id || null,
                timestamp: log.timestamp,
              };
            });
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
