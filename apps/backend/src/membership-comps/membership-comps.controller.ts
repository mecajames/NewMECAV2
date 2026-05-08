import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { MembershipCompsService, GrantCompDto } from './membership-comps.service';
import { MembershipCompType } from './membership-comp.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

interface GrantCompRequest {
  membership_id: string;
  comp_type: MembershipCompType;
  value: number;
  ends_at?: string | null;
  indefinite?: boolean;
  max_uses?: number;
  reason?: string;
  notes?: string;
}

@Controller('api/membership-comps')
export class MembershipCompsController {
  constructor(
    private readonly compsService: MembershipCompsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) throw new ForbiddenException('Admin access required');
    return { user, profile };
  }

  /**
   * Grant a new comp on a membership (admin only).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async grant(
    @Headers('authorization') authHeader: string,
    @Body() body: GrantCompRequest,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const dto: GrantCompDto = {
      membershipId: body.membership_id,
      compType: body.comp_type,
      value: body.value,
      endsAt: body.ends_at ?? null,
      indefinite: body.indefinite,
      maxUses: body.max_uses,
      reason: body.reason,
      notes: body.notes,
    };
    return this.compsService.grant(user.id, dto);
  }

  /**
   * All comps for a membership (admin only). Used by the Comps history tab.
   */
  @Get('membership/:membershipId')
  async listForMembership(
    @Headers('authorization') authHeader: string,
    @Param('membershipId') membershipId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.compsService.findByMembership(membershipId);
  }

  /**
   * Active comps only — for renewal-time decisions, badges on dashboards,
   * eligibility checks. Admin-scoped (no member self-serve via this route).
   */
  @Get('membership/:membershipId/active')
  async listActiveForMembership(
    @Headers('authorization') authHeader: string,
    @Param('membershipId') membershipId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.compsService.findActiveForMembership(membershipId);
  }

  /**
   * Admin-scoped: active comps across all of a specific user's memberships.
   * Used by the admin Member Detail header banner ("this member has X
   * active comp(s)") so the admin sees the comp status at-a-glance.
   */
  @Get('user/:userId/active')
  async listActiveForUserAdmin(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.compsService.findActiveForUser(userId);
  }

  /**
   * Member-scoped: list active comps on memberships the caller owns. Used
   * by the member dashboard badge and self-serve claim flow.
   *
   * IMPORTANT: this and other static routes must be declared BEFORE the
   * `:id` catch-all, otherwise NestJS matches `:id = 'my'` (or 'expire-due')
   * and 404s when it can't find a comp by that string.
   */
  @Get('my/active')
  async listMyActive(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    return this.compsService.findActiveForUser(user.id);
  }

  /**
   * Manual trigger of the daily expire-due-comps sweep. Cron does this at
   * 2am; the endpoint exists for admin troubleshooting.
   */
  @Post('expire-due')
  @HttpCode(HttpStatus.OK)
  async expireDue(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.compsService.expireDueComps();
  }

  /**
   * Manually trigger the comp-renewal sweep (auto-extend memberships +
   * $0 Order/Invoice). Cron does this daily at 2am.
   */
  @Post('process-renewals')
  @HttpCode(HttpStatus.OK)
  async processRenewals(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.compsService.processCompRenewals();
  }

  // ── :id catch-all routes — MUST be declared last so they don't shadow
  // the static routes above. ────────────────────────────────────────────

  @Get(':id')
  async getOne(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.compsService.findById(id);
  }

  /**
   * Revoke an active comp. Status becomes REVOKED, audit-logged.
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { reason?: string } = {},
  ) {
    const { user } = await this.requireAdmin(authHeader);
    return this.compsService.revoke(user.id, id, body.reason);
  }

}
