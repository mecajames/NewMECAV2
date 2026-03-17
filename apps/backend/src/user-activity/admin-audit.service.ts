import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AdminAuditLog } from './admin-audit-log.entity';

@Injectable()
export class AdminAuditService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Log an admin action. Fire-and-forget - errors are caught and logged.
   */
  async logAction(params: {
    adminUserId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    description?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ip?: string;
  }): Promise<void> {
    try {
      const entry = this.em.create(AdminAuditLog, {
        adminUser: params.adminUserId as any,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        description: params.description,
        old_values: params.oldValues,
        new_values: params.newValues,
        ip_address: params.ip,
      });
      await this.em.persistAndFlush(entry);
    } catch (err) {
      console.error('Failed to log admin action:', err);
    }
  }

  /**
   * Get paginated admin audit log with optional filters.
   */
  async getAuditLog(options: {
    action?: string;
    resourceType?: string;
    adminUserId?: string;
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

    if (options.action) {
      conditions.push(`a."action" = ?`);
      params.push(options.action);
    }

    if (options.resourceType) {
      conditions.push(`a."resource_type" = ?`);
      params.push(options.resourceType);
    }

    if (options.adminUserId) {
      conditions.push(`a."admin_user_id" = ?`);
      params.push(options.adminUserId);
    }

    if (options.search) {
      const term = `%${options.search}%`;
      conditions.push(`(a."description" ILIKE ? OR p."full_name" ILIKE ? OR p."email" ILIKE ?)`);
      params.push(term, term, term);
    }

    if (options.startDate) {
      conditions.push(`a."created_at" >= ?`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`a."created_at" <= ?`);
      params.push(options.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const conn = this.em.getConnection();

    const countResult = await conn.execute(
      `SELECT COUNT(*)::int AS count
       FROM "public"."admin_audit_log" a
       LEFT JOIN "public"."profiles" p ON a."admin_user_id" = p."id"
       ${where}`,
      params,
    );
    const total = countResult[0]?.count || 0;

    const rows = await conn.execute(
      `SELECT a."id", a."admin_user_id", a."action", a."resource_type", a."resource_id",
              a."description", a."old_values", a."new_values", a."ip_address", a."created_at",
              p."full_name" AS admin_name, p."email" AS admin_email
       FROM "public"."admin_audit_log" a
       LEFT JOIN "public"."profiles" p ON a."admin_user_id" = p."id"
       ${where}
       ORDER BY a."created_at" DESC
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
