import {
  Controller, Get, Post, Put, Body, Param, Query, Headers,
  HttpCode, HttpStatus, UnauthorizedException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Inject } from '@nestjs/common';
import { ZodError } from 'zod';
import {
  FeatureRequestStatus,
  CreateFeatureRequestSchema,
  CastFeatureVoteSchema,
  FeatureRequestMemberMessageSchema,
  AdminFeatureMessageSchema,
  UpdateFeatureRequestStatusSchema,
  UpdateFeatureThresholdSchema,
  ConvertTicketToFeatureSchema,
  CompleteFeatureDraftSchema,
} from '@newmeca/shared';
import { FeatureRequestsService } from './feature-requests.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { AdminAuditService } from '../user-activity/admin-audit.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * Member feature-request & voting endpoints (My MECA "Feature Ideas").
 *
 * NO @Public routes — the global ActiveMembershipGuard restricts everything to
 * active members. Member endpoints NEVER return voter identities, member
 * comments, or the interest threshold; those are admin-only.
 */
@Controller('api/feature-requests')
export class FeatureRequestsController {
  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly adminAuditService: AdminAuditService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async getAuthenticatedUser(authHeader?: string): Promise<{ userId: string; profile: Profile | null }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    const profile = await this.em.fork().findOne(Profile, { id: user.id });
    return { userId: user.id, profile };
  }

  private async requireAdmin(authHeader?: string): Promise<Profile> {
    const { profile } = await this.getAuthenticatedUser(authHeader);
    if (!isAdminUser(profile)) throw new ForbiddenException('Admin access required');
    return profile!;
  }

  private parse<T>(schema: { parse: (v: unknown) => T }, body: unknown): T {
    try {
      return schema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.issues[0]?.message ?? 'Invalid request');
      }
      throw err;
    }
  }

  // ==========================================================================
  // Member endpoints
  // ==========================================================================

  @Post()
  async submit(
    @Headers('authorization') authHeader: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    const dto = this.parse(CreateFeatureRequestSchema, body);
    return this.featureRequestsService.submit(userId, dto);
  }

  @Get()
  async list(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: string,
    @Query('sort') sort?: string,
  ) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    return this.featureRequestsService.listForMember(userId, {
      status: status as FeatureRequestStatus | undefined,
      sort: sort === 'newest' ? 'newest' : 'top',
    });
  }

  @Get('mine')
  async mine(@Headers('authorization') authHeader: string) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    return this.featureRequestsService.listMineForMember(userId);
  }

  @Get('dashboard')
  async dashboard(@Headers('authorization') authHeader: string) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    return this.featureRequestsService.dashboard(userId);
  }

  // ---- Admin (declared before ':id' routes so they never shadow) ----

  @Get('admin/all')
  async adminList(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.featureRequestsService.listForAdmin({ status: status as FeatureRequestStatus | undefined });
  }

  @Put('admin/:id/status')
  @HttpCode(HttpStatus.OK)
  async adminUpdateStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const dto = this.parse(UpdateFeatureRequestStatusSchema, body);
    const updated = await this.featureRequestsService.updateStatus(id, admin.id, dto);
    this.adminAuditService.logAction({
      adminUserId: admin.id,
      action: 'feature_request_status_change',
      resourceType: 'feature_request',
      resourceId: id,
      description: `Feature request "${updated.title}" → ${dto.status}${dto.plannedRelease ? ` (planned: ${dto.plannedRelease})` : ''}${dto.status === 'declined' ? (dto.declinePublic ? ' [public decline]' : ' [private decline]') : ''}`,
      newValues: { status: dto.status, plannedRelease: dto.plannedRelease ?? null, declinePublic: dto.declinePublic ?? false },
    });
    return updated;
  }

  @Put('admin/:id/threshold')
  @HttpCode(HttpStatus.OK)
  async adminUpdateThreshold(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const dto = this.parse(UpdateFeatureThresholdSchema, body);
    const updated = await this.featureRequestsService.updateThreshold(id, dto.thresholdPct);
    this.adminAuditService.logAction({
      adminUserId: admin.id,
      action: 'feature_request_threshold_change',
      resourceType: 'feature_request',
      resourceId: id,
      description: `Feature request "${updated.title}" interest threshold → ${dto.thresholdPct}%`,
      newValues: { thresholdPct: dto.thresholdPct },
    });
    return { id: updated.id, threshold_pct: Number(updated.thresholdPct) };
  }

  @Post('admin/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async adminMessage(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const dto = this.parse(AdminFeatureMessageSchema, body);
    return this.featureRequestsService.adminMessage(id, admin.id, dto.memberUserId, dto.body);
  }

  @Post('admin/run-expiry')
  @HttpCode(HttpStatus.OK)
  async adminRunExpiry(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.featureRequestsService.expireLapsedRequests();
  }

  /**
   * Admin: convert a support ticket into a feature request. The ticket is
   * hard-closed (member can never reopen it) and the member is notified by
   * bell + email; a too-thin description creates a needs-details draft.
   */
  @Post('admin/convert-from-ticket')
  @HttpCode(HttpStatus.CREATED)
  async adminConvertFromTicket(
    @Headers('authorization') authHeader: string,
    @Body() body: unknown,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const dto = this.parse(ConvertTicketToFeatureSchema, body);
    const { request, needsDetails } = await this.featureRequestsService.convertFromTicket(admin.id, dto);
    this.adminAuditService.logAction({
      adminUserId: admin.id,
      action: 'feature_request_ticket_conversion',
      resourceType: 'feature_request',
      resourceId: request.id,
      description: `Converted support ticket ${dto.ticketId} into feature request "${request.title}" (${request.category})${needsDetails ? ' — needs details from member' : ' — live'}`,
      newValues: { ticketId: dto.ticketId, category: request.category, needsDetails },
    });
    return { id: request.id, status: request.status, needsDetails };
  }

  /** Admin: read the needs-details completion deadline (days). */
  @Get('admin/settings')
  async adminGetSettings(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return { detailsDeadlineDays: await this.featureRequestsService.detailsDeadlineDays() };
  }

  /** Admin: update the needs-details completion deadline (days). */
  @Put('admin/settings')
  @HttpCode(HttpStatus.OK)
  async adminUpdateSettings(
    @Headers('authorization') authHeader: string,
    @Body() body: { detailsDeadlineDays?: number },
  ) {
    const admin = await this.requireAdmin(authHeader);
    const days = await this.featureRequestsService.setDetailsDeadlineDays(Number(body?.detailsDeadlineDays), admin.id);
    this.adminAuditService.logAction({
      adminUserId: admin.id,
      action: 'feature_request_settings_change',
      resourceType: 'feature_request',
      description: `Needs-details completion deadline → ${days} day(s)`,
      newValues: { detailsDeadlineDays: days },
    });
    return { detailsDeadlineDays: days };
  }

  // ---- Member ':id' routes ----

  @Get(':id')
  async detail(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    return this.featureRequestsService.detailForMember(id, userId);
  }

  @Put(':id/vote')
  @HttpCode(HttpStatus.OK)
  async vote(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    const dto = this.parse(CastFeatureVoteSchema, body);
    return this.featureRequestsService.castVote(id, userId, dto);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async memberReply(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    const dto = this.parse(FeatureRequestMemberMessageSchema, body);
    return this.featureRequestsService.memberReply(id, userId, dto.body);
  }

  /**
   * Member: one-time completion of a needs-details draft (ticket conversion
   * that was too thin). Full minimums apply; success takes the idea live.
   */
  @Put(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeDraft(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    const dto = this.parse(CompleteFeatureDraftSchema, body);
    return this.featureRequestsService.completeDraft(id, userId, dto);
  }

  @Post(':id/resubmit')
  @HttpCode(HttpStatus.CREATED)
  async resubmit(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { userId } = await this.getAuthenticatedUser(authHeader);
    const dto = this.parse(CreateFeatureRequestSchema, body);
    return this.featureRequestsService.submit(userId, dto, id);
  }
}
