import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { MemberAnalyticsService } from './member-analytics.service';

/**
 * Two surfaces:
 *
 *   POST /api/analytics/track-page  (any authenticated member)
 *     Fired by the frontend on every route change. Honors per-member
 *     opt-out. No-ops for anonymous traffic (auth guard rejects unauthed).
 *
 *   GET /api/admin/member-activity/...  (admin only)
 *     Reporting endpoints used by the Activity tab on the member detail
 *     page and by the cross-member dashboard.
 */
@Controller('api')
export class MemberAnalyticsController {
  constructor(
    private readonly memberAnalytics: MemberAnalyticsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // ── Member tracking endpoint ──

  @Post('analytics/track-page')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackPage(
    @Headers('authorization') authHeader: string,
    @Body() body: {
      pagePath: string;
      pageTitle?: string;
      referrer?: string;
      sessionId?: string;
    },
    @Req() req: Request,
  ): Promise<void> {
    const user = await this.requireAuthUser(authHeader);
    // Tracking is fire-and-forget from the user's perspective; we always
    // return 204 even on internal failures so a tracking outage never breaks
    // page navigation for the member.
    try {
      await this.memberAnalytics.trackPageView(user.id, {
        pagePath: body.pagePath,
        pageTitle: body.pageTitle,
        referrer: body.referrer,
        userAgent: req.headers['user-agent'] as string | undefined,
        sessionId: body.sessionId,
      });
    } catch {
      // Swallow — analytics never breaks navigation.
    }
  }

  // ── Admin reporting ──

  @Get('admin/member-activity/dashboard')
  async getDashboard(
    @Headers('authorization') authHeader: string,
    @Query('days') days = '7',
  ) {
    await this.requireAdmin(authHeader);
    const parsedDays = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90);
    return this.memberAnalytics.getDashboard(parsedDays);
  }

  @Get('admin/member-activity/:userId')
  async getMemberActivity(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
    @Query('limit') limit = '100',
  ) {
    await this.requireAdmin(authHeader);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    return this.memberAnalytics.getMemberActivity(userId, parsedLimit);
  }

  // ── Helpers ──

  private async requireAuthUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    return user;
  }

  private async requireAdmin(authHeader?: string) {
    const user = await this.requireAuthUser(authHeader);
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }
}
