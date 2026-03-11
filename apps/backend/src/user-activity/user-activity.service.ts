import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { LoginAuditLog } from './login-audit-log.entity';
import { Profile } from '../profiles/profiles.entity';

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
   * from the same user in the last 5 minutes.
   */
  async recordLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const conn = this.em.getConnection();

    // Check for duplicate login in last 5 minutes
    const existing = await conn.execute(
      `SELECT 1 FROM "public"."login_audit_log"
       WHERE "user_id" = ? AND "action" = 'login'
         AND "created_at" > now() - interval '5 minutes'
       LIMIT 1`,
      [userId],
    );

    if (existing.length > 0) return;

    const entry = this.em.create(LoginAuditLog, {
      email,
      user: userId as any,
      action: 'login',
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    await this.em.persistAndFlush(entry);
  }

  /**
   * Record a logout event.
   */
  async recordLogout(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const entry = this.em.create(LoginAuditLog, {
      email,
      user: userId as any,
      action: 'logout',
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
}
