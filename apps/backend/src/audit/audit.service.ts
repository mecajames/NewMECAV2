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
    console.log(`[AUDIT] logAction called - action: ${data.action}, resultId: ${data.resultId}, userId: ${data.userId}`);
    console.log(`[AUDIT] oldData event_id: ${data.oldData?.event_id}, eventId: ${data.oldData?.eventId}`);

    const em = this.em.fork();
    const log = em.create(ResultsAuditLog, {
      sessionId: data.sessionId || null,
      resultId: data.resultId || null,
      action: data.action,
      oldData: data.oldData || null,
      newData: data.newData || null,
      timestamp: new Date(),
      userId: data.userId,
    });

    await em.persistAndFlush(log);
    console.log(`[AUDIT] Log entry created with id: ${log.id}`);
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
   * Get sessions for an event
   */
  async getEventSessions(eventId: string): Promise<ResultsEntrySession[]> {
    const em = this.em.fork();
    const sessions = await em.find(
      ResultsEntrySession,
      { eventId },
      {
        populate: ['user'],
        orderBy: { sessionStart: 'DESC' },
      }
    );
    console.log(`[AUDIT] Found ${sessions.length} sessions for event ${eventId}`);
    sessions.forEach(s => {
      console.log(`[AUDIT] Session ${s.id}: resultCount=${s.resultCount}, user=${s.user?.email || 'NO USER'}`);
    });
    return sessions;
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
    const conn = em.getConnection();

    try {
      // Query audit logs where action is 'update' and either oldData or newData contains this event_id
      const results = await conn.execute(`
        SELECT
          ral.id,
          ral.session_id,
          ral.result_id,
          ral.action,
          ral.old_data,
          ral.new_data,
          ral.timestamp,
          ral.user_id,
          p.email as user_email,
          p.first_name as user_first_name,
          p.last_name as user_last_name
        FROM results_audit_log ral
        LEFT JOIN profiles p ON p.id = ral.user_id
        WHERE ral.action = 'update'
          AND (
            ral.old_data->>'event_id' = ?
            OR ral.new_data->>'event_id' = ?
            OR ral.old_data->>'eventId' = ?
            OR ral.new_data->>'eventId' = ?
          )
        ORDER BY ral.timestamp DESC
      `, [eventId, eventId, eventId, eventId]);

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
    const conn = em.getConnection();

    try {
      // Query audit logs where action is 'delete' and oldData contains this event_id
      const results = await conn.execute(`
        SELECT
          ral.id,
          ral.session_id,
          ral.result_id,
          ral.action,
          ral.old_data,
          ral.new_data,
          ral.timestamp,
          ral.user_id,
          p.email as user_email,
          p.first_name as user_first_name,
          p.last_name as user_last_name
        FROM results_audit_log ral
        LEFT JOIN profiles p ON p.id = ral.user_id
        WHERE ral.action = 'delete'
          AND (
            ral.old_data->>'event_id' = ?
            OR ral.old_data->>'eventId' = ?
          )
        ORDER BY ral.timestamp DESC
      `, [eventId, eventId]);

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
    const conn = em.getConnection();

    const results = await conn.execute(`
      SELECT
        ral.id,
        ral.session_id,
        ral.result_id,
        ral.action,
        ral.old_data,
        ral.new_data,
        ral.timestamp,
        ral.user_id,
        p.email as user_email,
        p.first_name as user_first_name,
        p.last_name as user_last_name
      FROM results_audit_log ral
      LEFT JOIN profiles p ON p.id = ral.user_id
      WHERE ral.id = ?
    `, [logId]);

    return results[0] || null;
  }
}
