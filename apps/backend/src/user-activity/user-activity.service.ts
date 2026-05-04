import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { LoginAuditLog } from './login-audit-log.entity';
import { Profile } from '../profiles/profiles.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class UserActivityService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Update last_seen_at for a user. Only writes to DB if the existing value
   * is NULL or older than 5 minutes (throttle to reduce DB writes).
   */
  async updateLastSeen(userId: string): Promise<void> {
    try {
      const conn = this.em.getConnection();
      await conn.execute(
        `UPDATE "public"."profiles"
         SET "last_seen_at" = now()
         WHERE "id" = ?
           AND ("last_seen_at" IS NULL OR "last_seen_at" < now() - interval '5 minutes')`,
        [userId],
      );
    } catch (err) {
      // Fire-and-forget: don't let last_seen failures break requests
      console.error('Failed to update last_seen_at:', err);
    }
  }

  /**
   * Record a login event. Deduplicates by checking for an existing login
   * from the same user in the last 5 minutes. Returns sessionId for tracking.
   */
  async recordLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string | null> {
    const conn = this.em.getConnection();

    // Check for duplicate login in last 5 minutes
    const existing = await conn.execute(
      `SELECT "session_id" FROM "public"."login_audit_log"
       WHERE "user_id" = ? AND "action" = 'login'
         AND "created_at" > now() - interval '5 minutes'
       LIMIT 1`,
      [userId],
    );

    if (existing.length > 0) return existing[0].session_id || null;

    const sessionId = randomUUID();
    const entry = this.em.create(LoginAuditLog, {
      email,
      user: userId as any,
      action: 'login',
      session_id: sessionId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    await this.em.persistAndFlush(entry);
    return sessionId;
  }

  /**
   * Record a logout event with optional session_id and reason.
   */
  async recordLogout(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
    logoutReason?: string,
  ): Promise<void> {
    const entry = this.em.create(LoginAuditLog, {
      email,
      user: userId as any,
      action: 'logout',
      session_id: sessionId,
      logout_reason: logoutReason || 'manual',
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    await this.em.persistAndFlush(entry);
  }

  /**
   * Record a failed login attempt.
   */
  async recordFailedAttempt(
    email: string,
    errorMessage?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const entry = this.em.create(LoginAuditLog, {
      email,
      action: 'failed_attempt',
      ip_address: ipAddress,
      user_agent: userAgent,
      error_message: errorMessage,
    });
    await this.em.persistAndFlush(entry);
  }

  /**
   * Get count of users active in the last 30 minutes.
   */
  async getOnlineCount(): Promise<number> {
    const conn = this.em.getConnection();
    const result = await conn.execute(
      `SELECT COUNT(*)::int AS count FROM "public"."profiles"
       WHERE "last_seen_at" > now() - interval '30 minutes'`,
    );
    return result[0]?.count || 0;
  }

  /**
   * Get list of user IDs active in the last 30 minutes.
   */
  async getOnlineUserIds(): Promise<string[]> {
    const conn = this.em.getConnection();
    const rows = await conn.execute(
      `SELECT "id" FROM "public"."profiles"
       WHERE "last_seen_at" > now() - interval '30 minutes'`,
    );
    return rows.map((r: any) => r.id);
  }

  /**
   * Get paginated sessions view - pairs login/logout by session_id.
   */
  async getSessionsView(options: {
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [`login."action" = 'login'`, `login."session_id" IS NOT NULL`];
    const params: any[] = [];

    if (options.search) {
      const term = `%${options.search}%`;
      conditions.push(`(login."email" ILIKE ? OR p."first_name" ILIKE ? OR p."last_name" ILIKE ?)`);
      params.push(term, term, term);
    }

    if (options.startDate) {
      conditions.push(`login."created_at" >= ?`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`login."created_at" <= ?`);
      params.push(options.endDate);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const conn = this.em.getConnection();

    const countResult = await conn.execute(
      `SELECT COUNT(*)::int AS count
       FROM "public"."login_audit_log" login
       LEFT JOIN "public"."profiles" p ON login."user_id" = p."id"
       ${where}`,
      params,
    );
    const total = countResult[0]?.count || 0;

    // The logout side must be deduplicated to one row per session_id, otherwise
    // a session with multiple logout rows (e.g. a manual logout plus a later
    // session_expired marker, or duplicate calls to recordLogout) multiplies
    // its login row in the result and produces duplicate React keys upstream.
    const rows = await conn.execute(
      `SELECT login."session_id", login."user_id", login."email",
              p."full_name", p."first_name", p."last_name",
              login."created_at" AS login_time,
              logout."created_at" AS logout_time,
              logout."logout_reason",
              CASE WHEN logout."created_at" IS NOT NULL
                THEN EXTRACT(EPOCH FROM (logout."created_at" - login."created_at"))::int
                ELSE NULL
              END AS duration_seconds,
              login."ip_address",
              login."user_agent"
       FROM "public"."login_audit_log" login
       LEFT JOIN (
         SELECT DISTINCT ON ("session_id")
           "session_id", "created_at", "logout_reason"
         FROM "public"."login_audit_log"
         WHERE "action" = 'logout' AND "session_id" IS NOT NULL
         ORDER BY "session_id", "created_at" ASC
       ) logout ON login."session_id" = logout."session_id"
       LEFT JOIN "public"."profiles" p ON login."user_id" = p."id"
       ${where}
       ORDER BY login."created_at" DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      items: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get session statistics summary.
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    avgDurationSeconds: number | null;
    activeSessions: number;
    manualLogouts: number;
    timeoutLogouts: number;
    failedAttempts24h: number;
    uniqueFailedIps24h: number;
  }> {
    const conn = this.em.getConnection();

    // Total sessions (with session_id)
    const totalResult = await conn.execute(
      `SELECT COUNT(*)::int AS count
       FROM "public"."login_audit_log"
       WHERE "action" = 'login' AND "session_id" IS NOT NULL`,
    );

    // Average duration of completed sessions
    const avgResult = await conn.execute(
      `SELECT AVG(EXTRACT(EPOCH FROM (logout."created_at" - login."created_at")))::int AS avg_duration
       FROM "public"."login_audit_log" login
       INNER JOIN "public"."login_audit_log" logout
         ON login."session_id" = logout."session_id" AND logout."action" = 'logout'
       WHERE login."action" = 'login' AND login."session_id" IS NOT NULL`,
    );

    // Active sessions (login with no matching logout)
    const activeResult = await conn.execute(
      `SELECT COUNT(*)::int AS count
       FROM "public"."login_audit_log" login
       LEFT JOIN "public"."login_audit_log" logout
         ON login."session_id" = logout."session_id" AND logout."action" = 'logout'
       WHERE login."action" = 'login'
         AND login."session_id" IS NOT NULL
         AND logout."id" IS NULL
         AND login."created_at" > now() - interval '4 hours'`,
    );

    // Logout reason breakdown
    const reasonResult = await conn.execute(
      `SELECT
         COALESCE(SUM(CASE WHEN "logout_reason" = 'manual' THEN 1 ELSE 0 END), 0)::int AS manual,
         COALESCE(SUM(CASE WHEN "logout_reason" = 'idle_timeout' THEN 1 ELSE 0 END), 0)::int AS timeout
       FROM "public"."login_audit_log"
       WHERE "action" = 'logout' AND "session_id" IS NOT NULL`,
    );

    // Failed attempts in last 24h
    const failedResult = await conn.execute(
      `SELECT COUNT(*)::int AS count,
              COUNT(DISTINCT "ip_address")::int AS unique_ips
       FROM "public"."login_audit_log"
       WHERE "action" = 'failed_attempt'
         AND "created_at" > now() - interval '24 hours'`,
    );

    return {
      totalSessions: totalResult[0]?.count || 0,
      avgDurationSeconds: avgResult[0]?.avg_duration || null,
      activeSessions: activeResult[0]?.count || 0,
      manualLogouts: reasonResult[0]?.manual || 0,
      timeoutLogouts: reasonResult[0]?.timeout || 0,
      failedAttempts24h: failedResult[0]?.count || 0,
      uniqueFailedIps24h: failedResult[0]?.unique_ips || 0,
    };
  }

  /**
   * Get paginated audit log with optional filters.
   */
  async getAuditLog(options: {
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (options.action && options.action !== 'all') {
      conditions.push(`l."action" = ?`);
      params.push(options.action);
    }

    if (options.search) {
      const term = `%${options.search}%`;
      conditions.push(`(l."email" ILIKE ? OR p."first_name" ILIKE ? OR p."last_name" ILIKE ?)`);
      params.push(term, term, term);
    }

    if (options.startDate) {
      conditions.push(`l."created_at" >= ?`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`l."created_at" <= ?`);
      params.push(options.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const conn = this.em.getConnection();

    // Count query
    const countResult = await conn.execute(
      `SELECT COUNT(*)::int AS count
       FROM "public"."login_audit_log" l
       LEFT JOIN "public"."profiles" p ON l."user_id" = p."id"
       ${where}`,
      params,
    );
    const total = countResult[0]?.count || 0;

    // Data query
    const rows = await conn.execute(
      `SELECT l."id", l."email", l."user_id", l."action", l."ip_address",
              l."user_agent", l."error_message", l."created_at",
              l."session_id", l."logout_reason",
              p."first_name", p."last_name", p."full_name"
       FROM "public"."login_audit_log" l
       LEFT JOIN "public"."profiles" p ON l."user_id" = p."id"
       ${where}
       ORDER BY l."created_at" DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      items: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete audit log entries older than the given number of days.
   * Returns count of deleted rows.
   */
  async rotateLoginAuditLog(retentionDays: number): Promise<number> {
    const conn = this.em.getConnection();
    const result = await conn.execute(
      `DELETE FROM "public"."login_audit_log"
       WHERE "created_at" < now() - make_interval(days => ?)
       RETURNING "id"`,
      [retentionDays],
    );
    return result.length;
  }

  /**
   * Delete admin audit log entries older than the given number of days.
   * Returns count of deleted rows.
   */
  async rotateAdminAuditLog(retentionDays: number): Promise<number> {
    const conn = this.em.getConnection();
    const result = await conn.execute(
      `DELETE FROM "public"."admin_audit_log"
       WHERE "created_at" < now() - make_interval(days => ?)
       RETURNING "id"`,
      [retentionDays],
    );
    return result.length;
  }

  /**
   * Mark orphaned sessions as session_expired (login older than 4h with no logout).
   */
  async markOrphanedSessions(): Promise<number> {
    const conn = this.em.getConnection();
    // Insert a logout record for orphaned sessions
    const result = await conn.execute(
      `INSERT INTO "public"."login_audit_log" ("id", "email", "user_id", "action", "session_id", "logout_reason", "created_at")
       SELECT gen_random_uuid(), login."email", login."user_id", 'logout', login."session_id", 'session_expired',
              login."created_at" + interval '4 hours'
       FROM "public"."login_audit_log" login
       LEFT JOIN "public"."login_audit_log" logout
         ON login."session_id" = logout."session_id" AND logout."action" = 'logout'
       WHERE login."action" = 'login'
         AND login."session_id" IS NOT NULL
         AND logout."id" IS NULL
         AND login."created_at" < now() - interval '4 hours'
       RETURNING "id"`,
    );
    return result.length;
  }

  /**
   * Get emails/IPs with 5+ failed attempts in the last interval.
   */
  async getBruteForceAttempts(intervalMinutes: number = 15, threshold: number = 5): Promise<{
    byEmail: Array<{ email: string; count: number }>;
    byIp: Array<{ ip_address: string; count: number }>;
  }> {
    const conn = this.em.getConnection();

    const byEmail = await conn.execute(
      `SELECT "email", COUNT(*)::int AS count
       FROM "public"."login_audit_log"
       WHERE "action" = 'failed_attempt'
         AND "created_at" > now() - make_interval(mins => ?)
       GROUP BY "email"
       HAVING COUNT(*) >= ?
       ORDER BY count DESC`,
      [intervalMinutes, threshold],
    );

    const byIp = await conn.execute(
      `SELECT "ip_address", COUNT(*)::int AS count
       FROM "public"."login_audit_log"
       WHERE "action" = 'failed_attempt'
         AND "created_at" > now() - make_interval(mins => ?)
         AND "ip_address" IS NOT NULL
       GROUP BY "ip_address"
       HAVING COUNT(*) >= ?
       ORDER BY count DESC`,
      [intervalMinutes, threshold],
    );

    return { byEmail: byEmail as any[], byIp: byIp as any[] };
  }
}
