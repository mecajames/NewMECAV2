import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { Public } from '../auth/public.decorator';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser, isSuperAdmin } from '../auth/is-admin.helper';
import { UserActivityService } from './user-activity.service';
import { AdminAuditService } from './admin-audit.service';

@Controller('api/user-activity')
export class UserActivityController {
  constructor(
    private readonly userActivityService: UserActivityService,
    private readonly adminAuditService: AdminAuditService,
    private readonly em: EntityManager,
  ) {}

  /** Extract the real client IP (first entry in x-forwarded-for chain) */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      // x-forwarded-for is "client, proxy1, proxy2" - take the first one
      return forwarded.split(',')[0].trim();
    }
    return req.ip || '';
  }

  /**
   * Record a login event. Called by frontend after successful sign-in.
   * Returns sessionId for session tracking.
   */
  @Public()
  @Post('login')
  async recordLogin(@Req() req: Request): Promise<{ sessionId: string | null }> {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return { sessionId: null };

    const email = (req.body?.email as string) || '';
    const ip = this.getClientIp(req);
    const ua = req.headers['user-agent'] || '';

    const sessionId = await this.userActivityService.recordLogin(userId, email, ip, ua);
    return { sessionId };
  }

  /**
   * Record a logout event. Called by frontend before sign-out.
   */
  @Public()
  @Post('logout')
  @HttpCode(204)
  async recordLogout(@Req() req: Request): Promise<void> {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return;

    const email = (req.body?.email as string) || '';
    const sessionId = (req.body?.sessionId as string) || undefined;
    const reason = (req.body?.reason as string) || 'manual';
    const ip = this.getClientIp(req);
    const ua = req.headers['user-agent'] || '';

    await this.userActivityService.recordLogout(userId, email, ip, ua, sessionId, reason);
  }

  /**
   * Record a failed login attempt. Public endpoint, rate-limited.
   */
  @Public()
  @Post('failed-attempt')
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: 900000 } }) // 20 per 15 min
  async recordFailedAttempt(@Req() req: Request, @Body() body: { email: string; error?: string }): Promise<void> {
    if (!body.email) return;

    const ip = this.getClientIp(req);
    const ua = req.headers['user-agent'] || '';

    await this.userActivityService.recordFailedAttempt(body.email, body.error, ip, ua);
  }

  /**
   * Get count of currently online users (active in last 30 min). Admin only.
   */
  @Get('online-count')
  async getOnlineCount(@Req() req: Request): Promise<{ count: number; peak: number }> {
    await this.requireAdmin(req);
    // Also returns (and maintains) the all-time high-water mark for the
    // admin dashboard "Currently Online X / peak Y" card.
    return this.userActivityService.getOnlineStats();
  }

  /**
   * Get list of online user IDs. Admin only.
   */
  @Get('online-users')
  async getOnlineUsers(@Req() req: Request): Promise<{ userIds: string[] }> {
    await this.requireAdmin(req);
    const userIds = await this.userActivityService.getOnlineUserIds();
    return { userIds };
  }

  /**
   * Get paginated login audit log. Admin only.
   */
  @Get('audit-log')
  async getAuditLog(
    @Req() req: Request,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.requireAdmin(req);
    return this.userActivityService.getAuditLog({
      action,
      search,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Get paginated sessions view. Admin only.
   */
  @Get('sessions')
  async getSessions(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.requireAdmin(req);
    return this.userActivityService.getSessionsView({
      search,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Get session statistics summary. Admin only.
   */
  @Get('session-stats')
  async getSessionStats(@Req() req: Request) {
    await this.requireAdmin(req);
    return this.userActivityService.getSessionStats();
  }

  /**
   * Get paginated admin audit log. SUPER ADMIN only (James / Mick) — this is the
   * full record of every admin action on members/memberships/billing, so it's
   * locked tighter than the rest of the admin dashboards.
   */
  @Get('admin-audit-log')
  async getAdminAuditLog(
    @Req() req: Request,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('adminUserId') adminUserId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.requireSuperAdmin(req);
    return this.adminAuditService.getAuditLog({
      action,
      resourceType,
      adminUserId,
      search,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Resolve the acting profile from the TOKEN-validated user that GlobalAuthGuard
   * attached to the request (req.user). We deliberately do NOT trust the
   * client-supplied `x-user-id` header for authorization — it's spoofable.
   */
  private async loadActor(req: Request): Promise<Profile | null> {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }
    return this.em.fork().findOne(Profile, { id: userId });
  }

  /** Require any admin/staff (real role check, not just header presence). */
  private async requireAdmin(req: Request): Promise<void> {
    const profile = await this.loadActor(req);
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /** Require super admin (James 202401 / Mick 700947). */
  private async requireSuperAdmin(req: Request): Promise<void> {
    const profile = await this.loadActor(req);
    if (!isSuperAdmin(profile)) {
      throw new ForbiddenException('Super admin access required');
    }
  }
}
