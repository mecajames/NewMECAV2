import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
  Logger,
  Req,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AdminCreateMembershipDto, AdminCreateMembershipSchema, UserRole, MembershipAccountType, PaymentStatus } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { ZodError } from 'zod';
import { MembershipsService, AdminAssignMembershipDto, CreateMembershipDto, AdminCreateMembershipResult } from './memberships.service';
import { Membership } from './memberships.entity';
import { MecaIdService } from './meca-id.service';
import { MasterSecondaryService, CreateSecondaryMembershipDto, SecondaryMembershipInfo, MasterMembershipInfo } from './master-secondary.service';
import { MembershipSyncService } from './membership-sync.service';

@Controller('api/memberships')
export class MembershipsController {
  private readonly logger = new Logger(MembershipsController.name);

  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly mecaIdService: MecaIdService,
    private readonly masterSecondaryService: MasterSecondaryService,
    private readonly membershipSyncService: MembershipSyncService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to get authenticated user from token
  private async getAuthenticatedUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    return { user, profile };
  }

  // Helper to require admin OR owner access
  private async requireAdminOrOwner(authHeader: string | undefined, targetUserId: string) {
    const { user, profile } = await this.getAuthenticatedUser(authHeader);

    if (profile?.role === UserRole.ADMIN) {
      return { user, profile, isAdmin: true };
    }

    if (user.id !== targetUserId) {
      throw new ForbiddenException('You can only access your own membership data');
    }

    return { user, profile, isAdmin: false };
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    const { user, profile } = await this.getAuthenticatedUser(authHeader);

    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return { user, profile };
  }

  /**
   * Create a new membership for a user
   * Replaces the old guest/user checkout flow - all memberships require a user account
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMembership(@Body() data: CreateMembershipDto): Promise<Membership> {
    return this.membershipsService.createMembership(data);
  }

  /**
   * Check if a user can purchase a specific membership type
   * Returns validation result with error message if not allowed
   */
  @Get('can-purchase')
  async canPurchaseMembership(
    @Query('userId') userId: string,
    @Query('membershipTypeConfigId') membershipTypeConfigId: string,
  ): Promise<{ canPurchase: boolean; reason?: string; existingMembershipId?: string }> {
    const result = await this.membershipsService.canPurchaseMembership(userId, membershipTypeConfigId);
    return {
      canPurchase: result.allowed,
      reason: result.reason,
      existingMembershipId: result.existingMembershipId,
    };
  }

  @Get(':id')
  async getMembership(@Param('id') id: string): Promise<Membership> {
    return this.membershipsService.findById(id);
  }

  @Put(':id')
  async updateMembership(
    @Param('id') id: string,
    @Body() data: Partial<Membership>,
  ): Promise<Membership> {
    return this.membershipsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMembership(@Param('id') id: string): Promise<void> {
    return this.membershipsService.delete(id);
  }

  @Get('user/:userId/active')
  async getUserActiveMembership(@Param('userId') userId: string): Promise<Membership | null> {
    return this.membershipsService.getActiveMembership(userId);
  }

  @Post('user/:userId/renew')
  async renewMembership(
    @Param('userId') userId: string,
    @Body('membershipTypeConfigId') membershipTypeConfigId: string,
  ): Promise<Membership> {
    return this.membershipsService.renewMembership(userId, membershipTypeConfigId);
  }

  /**
   * Get all memberships for a user
   */
  @Get('user/:userId/all')
  async getAllUserMemberships(@Param('userId') userId: string): Promise<Membership[]> {
    return this.membershipsService.getAllMembershipsByUser(userId);
  }

  /**
   * Get all MECA IDs for a user across their memberships
   */
  @Get('user/:userId/meca-ids')
  async getUserMecaIds(@Param('userId') userId: string): Promise<any[]> {
    return this.mecaIdService.getUserMecaIds(userId);
  }

  /**
   * Update team name for a membership (subject to 30-day edit window)
   */
  @Put(':id/team-name')
  async updateTeamName(
    @Param('id') id: string,
    @Body('teamName') teamName: string,
    @Body('isAdmin') isAdmin?: boolean,
  ): Promise<Membership> {
    return this.membershipsService.updateTeamName(id, teamName, isAdmin);
  }

  /**
   * Update vehicle info for a membership
   */
  @Put(':id/vehicle')
  async updateVehicleInfo(
    @Param('id') id: string,
    @Body() vehicleData: {
      vehicleLicensePlate?: string;
      vehicleColor?: string;
      vehicleMake?: string;
      vehicleModel?: string;
    },
  ): Promise<Membership> {
    return this.membershipsService.updateVehicleInfo(id, vehicleData);
  }

  /**
   * Admin: Get all memberships in the system
   */
  @Get('admin/all')
  async getAllMemberships(
    @Headers('authorization') authHeader: string,
  ): Promise<Membership[]> {
    await this.requireAdmin(authHeader);
    return this.membershipsService.getAllMemberships();
  }

  /**
   * Admin: Assign a membership to a user without payment (legacy - use admin/create instead)
   */
  @Post('admin/assign')
  @HttpCode(HttpStatus.CREATED)
  async adminAssignMembership(
    @Headers('authorization') authHeader: string,
    @Body() data: AdminAssignMembershipDto,
  ): Promise<Membership> {
    await this.requireAdmin(authHeader);
    return this.membershipsService.adminAssignMembership(data);
  }

  /**
   * Admin: Create a membership with full details and payment options.
   * Supports Cash, Check, Credit Card (Invoice), and Complimentary payment methods.
   *
   * @returns The created membership, along with order and invoice if applicable
   */
  @Post('admin/create')
  @HttpCode(HttpStatus.CREATED)
  async adminCreateMembership(
    @Headers('authorization') authHeader: string,
    @Body() data: AdminCreateMembershipDto,
  ): Promise<AdminCreateMembershipResult> {
    await this.requireAdmin(authHeader);
    this.logger.log(`Admin create membership request received:`, JSON.stringify(data, null, 2));

    try {
      // Validate the input using the Zod schema
      const validated = AdminCreateMembershipSchema.parse(data);
      this.logger.log(`Validated data:`, JSON.stringify(validated, null, 2));
      return this.membershipsService.adminCreateMembership(validated);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        this.logger.error(`Validation failed: ${errorMessages}`);
        throw new BadRequestException(`Validation failed: ${errorMessages}`);
      }
      throw error;
    }
  }

  /**
   * Admin: Get MECA ID history
   */
  @Get('admin/meca-id-history')
  async getMecaIdHistory(
    @Headers('authorization') authHeader: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ items: any[]; total: number }> {
    await this.requireAdmin(authHeader);
    return this.mecaIdService.getAllMecaIdHistory(limit || 50, offset || 0);
  }

  /**
   * Admin: Get history for a specific MECA ID
   */
  @Get('admin/meca-id/:mecaId/history')
  async getMecaIdHistoryById(
    @Headers('authorization') authHeader: string,
    @Param('mecaId') mecaId: string,
  ): Promise<any[]> {
    await this.requireAdmin(authHeader);
    const mecaIdNum = parseInt(mecaId, 10);
    if (isNaN(mecaIdNum)) {
      return [];
    }
    return this.mecaIdService.getMecaIdHistory(mecaIdNum);
  }

  // ========================
  // Team Upgrade Endpoints
  // ========================

  /**
   * Get team upgrade details and pro-rated price for a membership
   */
  @Get(':id/team-upgrade')
  async getTeamUpgradeDetails(@Param('id') id: string): Promise<{
    eligible: boolean;
    reason?: string;
    originalPrice: number;
    proRatedPrice: number;
    daysRemaining: number;
    membershipId: string;
    membershipEndDate: Date;
  } | null> {
    return this.membershipsService.getTeamUpgradeDetails(id);
  }

  /**
   * Apply team upgrade after payment (called by Stripe webhook or admin)
   */
  @Post(':id/team-upgrade/apply')
  @HttpCode(HttpStatus.OK)
  async applyTeamUpgrade(
    @Param('id') id: string,
    @Body() data: { teamName: string; teamDescription?: string },
  ): Promise<Membership> {
    return this.membershipsService.applyTeamUpgrade(id, data.teamName, data.teamDescription);
  }

  // =============================================================================
  // Master/Secondary Membership Endpoints
  // =============================================================================

  /**
   * Upgrade a membership to master status
   * Allows the membership holder to add secondary memberships
   */
  @Post(':id/upgrade-to-master')
  @HttpCode(HttpStatus.OK)
  async upgradeToMaster(@Param('id') id: string): Promise<Membership> {
    return this.masterSecondaryService.upgradeToMaster(id);
  }

  /**
   * Create a secondary membership linked to a master
   */
  @Post(':id/secondaries')
  @HttpCode(HttpStatus.CREATED)
  async createSecondaryMembership(
    @Param('id') masterMembershipId: string,
    @Body() data: Omit<CreateSecondaryMembershipDto, 'masterMembershipId'>,
  ): Promise<Membership> {
    return this.masterSecondaryService.createSecondaryMembership({
      ...data,
      masterMembershipId,
    });
  }

  /**
   * Get all secondary memberships for a master
   */
  @Get(':id/secondaries')
  async getSecondaryMemberships(@Param('id') masterMembershipId: string): Promise<SecondaryMembershipInfo[]> {
    return this.masterSecondaryService.getSecondaryMemberships(masterMembershipId);
  }

  /**
   * Get master membership info including all secondaries
   */
  @Get(':id/master-info')
  async getMasterMembershipInfo(@Param('id') membershipId: string): Promise<MasterMembershipInfo> {
    return this.masterSecondaryService.getMasterMembershipInfo(membershipId);
  }

  /**
   * Remove a secondary from master (upgrades secondary to independent)
   */
  @Delete(':id/secondaries/:secondaryId')
  @HttpCode(HttpStatus.OK)
  async removeSecondary(
    @Param('id') masterMembershipId: string,
    @Param('secondaryId') secondaryMembershipId: string,
    @Body('requestingUserId') requestingUserId: string,
  ): Promise<Membership> {
    return this.masterSecondaryService.removeSecondary(secondaryMembershipId, requestingUserId);
  }

  /**
   * Upgrade a secondary membership to independent status
   */
  @Post(':id/upgrade-to-independent')
  @HttpCode(HttpStatus.OK)
  async upgradeToIndependent(@Param('id') secondaryMembershipId: string): Promise<Membership> {
    return this.masterSecondaryService.upgradeToIndependent(secondaryMembershipId);
  }

  /**
   * Mark a secondary membership as paid and assign MECA ID
   */
  @Post(':id/mark-secondary-paid')
  @HttpCode(HttpStatus.OK)
  async markSecondaryPaid(
    @Param('id') secondaryMembershipId: string,
    @Body() data: { amountPaid: number; transactionId?: string },
  ): Promise<Membership> {
    return this.masterSecondaryService.markSecondaryPaid(secondaryMembershipId, data.amountPaid, data.transactionId);
  }

  /**
   * Update a secondary membership's details (competitor name, relationship, vehicle info)
   * Can be called by the secondary owner or the master
   */
  @Put(':id/secondary-details')
  async updateSecondaryDetails(
    @Param('id') secondaryMembershipId: string,
    @Body() data: {
      requestingUserId: string;
      competitorName?: string;
      relationshipToMaster?: string;
      vehicleMake?: string;
      vehicleModel?: string;
      vehicleColor?: string;
      vehicleLicensePlate?: string;
    },
  ): Promise<Membership> {
    const { requestingUserId, ...updateData } = data;
    return this.masterSecondaryService.updateSecondaryDetails(secondaryMembershipId, requestingUserId, updateData);
  }

  /**
   * Get all MECA IDs controlled by a user (their own + all secondaries)
   */
  @Get('user/:userId/controlled-meca-ids')
  async getControlledMecaIds(
    @Param('userId') userId: string,
  ): Promise<Array<{
    mecaId: number;
    membershipId: string;
    profileId: string;
    competitorName: string;
    isOwn: boolean;
    relationshipToMaster?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    vehicleLicensePlate?: string;
  }>> {
    return this.masterSecondaryService.getControlledMecaIds(userId);
  }

  /**
   * Check if a user has access to a specific MECA ID
   */
  @Get('user/:userId/has-access/:mecaId')
  async hasAccessToMecaId(
    @Param('userId') userId: string,
    @Param('mecaId') mecaId: string,
  ): Promise<{ hasAccess: boolean }> {
    const mecaIdNum = parseInt(mecaId, 10);
    if (isNaN(mecaIdNum)) {
      return { hasAccess: false };
    }
    const hasAccess = await this.masterSecondaryService.hasAccessToMecaId(userId, mecaIdNum);
    return { hasAccess };
  }

  /**
   * Check if a profile is a secondary account
   */
  @Get('profile/:profileId/is-secondary')
  async isSecondaryProfile(@Param('profileId') profileId: string): Promise<{ isSecondary: boolean }> {
    const isSecondary = await this.masterSecondaryService.isSecondaryProfile(profileId);
    return { isSecondary };
  }

  /**
   * Admin: Fix secondary memberships that don't have their own profiles.
   * This is a one-time fix for secondaries created before the system was updated
   * to always create profiles for secondary members.
   */
  @Post('admin/fix-secondary-profiles')
  @HttpCode(HttpStatus.OK)
  async fixSecondaryProfiles(
    @Headers('authorization') authHeader: string,
  ): Promise<{ fixed: number; errors: string[] }> {
    await this.requireAdmin(authHeader);
    this.logger.log('Admin triggered fix for secondary memberships without profiles');
    return this.masterSecondaryService.fixSecondaryMembershipsWithoutProfiles();
  }

  /**
   * Admin: Fix orphaned memberships that should be secondary but aren't linked.
   * This finds memberships where the same user_id has multiple memberships and
   * links the one without MECA ID as secondary to the one with MECA ID.
   */
  @Post('admin/fix-orphaned-secondaries')
  @HttpCode(HttpStatus.OK)
  async fixOrphanedSecondaries(
    @Headers('authorization') authHeader: string,
  ): Promise<{ fixed: number; details: string[] }> {
    await this.requireAdmin(authHeader);
    this.logger.log('Admin triggered fix for orphaned secondary memberships');

    const em = this.em.fork();
    const details: string[] = [];
    let fixed = 0;

    // Find all users who have multiple memberships with payment_status paid or pending
    const memberships = await em.find(Membership, {
      paymentStatus: { $in: [PaymentStatus.PAID, PaymentStatus.PENDING] },
    }, {
      populate: ['user'],
      orderBy: { createdAt: 'ASC' },
    });

    // Group by user_id
    const byUser = new Map<string, Membership[]>();
    for (const m of memberships) {
      const userId = m.user.id;
      if (!byUser.has(userId)) {
        byUser.set(userId, []);
      }
      byUser.get(userId)!.push(m);
    }

    // Process users with multiple memberships
    for (const [userId, userMemberships] of byUser) {
      if (userMemberships.length <= 1) continue;

      // Find the master (one with MECA ID, preferably paid)
      const masterCandidates = userMemberships.filter(m => m.mecaId && m.paymentStatus === PaymentStatus.PAID);
      if (masterCandidates.length === 0) {
        details.push(`User ${userId}: No valid master membership found (no paid membership with MECA ID)`);
        continue;
      }

      const master = masterCandidates[0];

      // Find secondaries (ones without MECA ID that are still 'independent')
      const secondaryCandidates = userMemberships.filter(
        m => !m.mecaId && m.accountType !== MembershipAccountType.SECONDARY && m.id !== master.id
      );

      if (secondaryCandidates.length === 0) {
        details.push(`User ${userId}: No orphaned secondary memberships found`);
        continue;
      }

      // Upgrade master to 'master' type if not already
      if (master.accountType !== MembershipAccountType.MASTER) {
        master.accountType = MembershipAccountType.MASTER;
        details.push(`User ${userId}: Upgraded membership ${master.id} (MECA ${master.mecaId}) to master`);
      }

      // Link each secondary to the master
      for (const secondary of secondaryCandidates) {
        secondary.accountType = MembershipAccountType.SECONDARY;
        secondary.masterMembership = master;
        secondary.hasOwnLogin = false; // They share the master's profile
        details.push(`User ${userId}: Linked membership ${secondary.id} as secondary to master ${master.id} (MECA ${master.mecaId})`);
        fixed++;
      }
    }

    await em.flush();
    this.logger.log(`Fixed ${fixed} orphaned secondary memberships`);

    return { fixed, details };
  }

  /**
   * Admin: Manually trigger membership status sync.
   * This syncs profile.membership_status with actual membership end_dates.
   * Normally runs automatically at 1:00 AM daily.
   */
  @Post('admin/sync-membership-statuses')
  @HttpCode(HttpStatus.OK)
  async syncMembershipStatuses(
    @Headers('authorization') authHeader: string,
  ): Promise<{ activated: number; expired: number }> {
    await this.requireAdmin(authHeader);
    this.logger.log('Admin triggered manual membership status sync');
    return this.membershipSyncService.triggerDailySync();
  }

  // Super Admin password for protected MECA ID operations
  private readonly SUPER_ADMIN_PASSWORD = '*cvStFU@yxEb6QQg';

  /**
   * Super Admin: Override MECA ID on a membership
   * Requires admin role + special password
   * Used for:
   * - Reassigning an old MECA ID to a member (after 90 days)
   * - Manually correcting MECA ID assignment errors
   */
  @Put(':id/admin/override-meca-id')
  @HttpCode(HttpStatus.OK)
  async overrideMecaId(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
    @Body() data: {
      newMecaId: number;
      superAdminPassword: string;
      reason: string;
    },
  ): Promise<{ success: boolean; membership: Membership; message: string }> {
    // Require admin role
    const { profile } = await this.requireAdmin(authHeader);

    // Validate super admin password
    if (data.superAdminPassword !== this.SUPER_ADMIN_PASSWORD) {
      throw new ForbiddenException('Invalid super admin password');
    }

    if (!data.newMecaId || data.newMecaId < 1) {
      throw new BadRequestException('Valid MECA ID is required');
    }

    if (!data.reason || data.reason.trim().length < 10) {
      throw new BadRequestException('A reason (at least 10 characters) is required for MECA ID override');
    }

    this.logger.warn(`SUPER ADMIN OVERRIDE: Admin ${profile?.email} overriding MECA ID for membership ${membershipId} to ${data.newMecaId}. Reason: ${data.reason}`);

    const result = await this.membershipsService.superAdminOverrideMecaId(
      membershipId,
      data.newMecaId,
      profile?.id || 'unknown',
      data.reason,
    );

    return result;
  }

  /**
   * Super Admin: Force keep same MECA ID when renewing after 90 days
   * Requires admin role + special password
   * Bypasses the 90-day rule that normally assigns a new MECA ID
   */
  @Post('admin/renew-keep-meca-id')
  @HttpCode(HttpStatus.CREATED)
  async renewKeepMecaId(
    @Headers('authorization') authHeader: string,
    @Body() data: {
      userId: string;
      membershipTypeConfigId: string;
      previousMecaId: number;
      superAdminPassword: string;
      reason: string;
    },
  ): Promise<{ success: boolean; membership: Membership; message: string }> {
    // Require admin role
    const { profile } = await this.requireAdmin(authHeader);

    // Validate super admin password
    if (data.superAdminPassword !== this.SUPER_ADMIN_PASSWORD) {
      throw new ForbiddenException('Invalid super admin password');
    }

    if (!data.previousMecaId || data.previousMecaId < 1) {
      throw new BadRequestException('Previous MECA ID is required');
    }

    if (!data.reason || data.reason.trim().length < 10) {
      throw new BadRequestException('A reason (at least 10 characters) is required for 90-day rule override');
    }

    this.logger.warn(`SUPER ADMIN OVERRIDE: Admin ${profile?.email} creating renewal with forced MECA ID ${data.previousMecaId} for user ${data.userId}. Reason: ${data.reason}`);

    const result = await this.membershipsService.renewMembershipKeepMecaId(
      data.userId,
      data.membershipTypeConfigId,
      data.previousMecaId,
      profile?.id || 'unknown',
      data.reason,
    );

    return result;
  }

  // =============================================================================
  // Admin Cancellation Endpoints
  // =============================================================================

  /**
   * Admin: Cancel a membership immediately.
   * Deactivates the membership immediately and sets status to CANCELLED.
   */
  @Post(':id/admin/cancel-immediately')
  @HttpCode(HttpStatus.OK)
  async cancelMembershipImmediately(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
    @Body() data: { reason: string },
  ): Promise<{ success: boolean; membership: Membership; message: string }> {
    const { profile } = await this.requireAdmin(authHeader);

    if (!data.reason || data.reason.trim().length < 5) {
      throw new BadRequestException('A reason (at least 5 characters) is required for cancellation');
    }

    this.logger.log(`Admin ${profile?.email} cancelling membership ${membershipId} immediately. Reason: ${data.reason}`);

    return this.membershipsService.cancelMembershipImmediately(
      membershipId,
      data.reason,
      profile?.id || 'unknown',
    );
  }

  /**
   * Admin: Schedule a membership to be cancelled at the end of its current period.
   * The membership remains active until the end date.
   */
  @Post(':id/admin/cancel-at-renewal')
  @HttpCode(HttpStatus.OK)
  async cancelMembershipAtRenewal(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
    @Body() data: { reason: string },
  ): Promise<{ success: boolean; membership: Membership; message: string }> {
    const { profile } = await this.requireAdmin(authHeader);

    if (!data.reason || data.reason.trim().length < 5) {
      throw new BadRequestException('A reason (at least 5 characters) is required for cancellation');
    }

    this.logger.log(`Admin ${profile?.email} scheduling cancellation at renewal for membership ${membershipId}. Reason: ${data.reason}`);

    return this.membershipsService.cancelMembershipAtRenewal(
      membershipId,
      data.reason,
      profile?.id || 'unknown',
    );
  }

  /**
   * Admin: Refund a membership.
   * Cancels immediately, processes Stripe refund, and sends notification email.
   */
  @Post(':id/admin/refund')
  @HttpCode(HttpStatus.OK)
  async refundMembership(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
    @Body() data: { reason: string },
  ): Promise<{
    success: boolean;
    membership: Membership;
    stripeRefund: { id: string; amount: number; status: string } | null;
    message: string;
  }> {
    const { profile } = await this.requireAdmin(authHeader);

    if (!data.reason || data.reason.trim().length < 5) {
      throw new BadRequestException('A reason (at least 5 characters) is required for refund');
    }

    this.logger.log(`Admin ${profile?.email} refunding membership ${membershipId}. Reason: ${data.reason}`);

    return this.membershipsService.refundMembership(
      membershipId,
      data.reason,
      profile?.id || 'unknown',
    );
  }

  /**
   * Admin: Get cancellation information for a membership
   */
  @Get(':id/admin/cancellation-info')
  async getCancellationInfo(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    isCancelled: boolean;
    cancelAtPeriodEnd: boolean;
    cancelledAt?: Date;
    cancellationReason?: string;
    cancelledBy?: string;
    effectiveEndDate?: Date;
  }> {
    await this.requireAdmin(authHeader);
    return this.membershipsService.getCancellationInfo(membershipId);
  }

  // =============================================================================
  // Member Self-Service Cancellation Endpoint
  // =============================================================================

  /**
   * Member: Request cancellation of their own membership.
   * This schedules cancellation at the end of the current period (NOT immediate).
   * Members who want immediate cancellation must contact support.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async memberCancelMembership(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
    @Body() data: { reason?: string },
  ): Promise<{
    success: boolean;
    message: string;
    effectiveEndDate: Date;
  }> {
    // Get authenticated user
    const { user } = await this.getAuthenticatedUser(authHeader);

    // Verify the membership belongs to this user
    const membership = await this.membershipsService.findById(membershipId);
    if (membership.user.id !== user.id) {
      throw new ForbiddenException('You can only cancel your own membership');
    }

    if (membership.cancelledAt) {
      throw new BadRequestException('This membership has already been cancelled');
    }

    if (membership.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Can only cancel active (paid) memberships');
    }

    // Schedule cancellation at period end (NOT immediate for self-service)
    const result = await this.membershipsService.cancelMembershipAtRenewal(
      membershipId,
      data.reason || 'Member requested cancellation',
      user.id,
    );

    return {
      success: true,
      message: `Your membership has been scheduled for cancellation. You will continue to have access until ${result.membership.endDate?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. If you need immediate cancellation, please contact our support team.`,
      effectiveEndDate: result.membership.endDate!,
    };
  }

  // =============================================================================
  // AUTO-RENEWAL / SUBSCRIPTION MANAGEMENT ENDPOINTS
  // =============================================================================

  /**
   * Get auto-renewal/subscription status for a membership
   */
  @Get(':id/subscription-status')
  async getSubscriptionStatus(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    autoRenewStatus: 'on' | 'legacy' | 'off';
    stripeSubscriptionId?: string;
    hadLegacySubscription: boolean;
    stripeSubscriptionStatus?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }> {
    const { user } = await this.getAuthenticatedUser(authHeader);
    const membership = await this.membershipsService.findById(membershipId);

    // Allow member to view their own, or admin to view any
    const isOwner = membership.user.id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only view your own membership subscription status');
    }

    return this.membershipsService.getSubscriptionStatus(membershipId);
  }

  /**
   * Admin: Cancel auto-renewal for a membership
   * This cancels the Stripe subscription (if exists) at period end
   */
  @Post(':id/admin/cancel-auto-renewal')
  @HttpCode(HttpStatus.OK)
  async adminCancelAutoRenewal(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
    @Body() data: { reason?: string; cancelImmediately?: boolean },
  ): Promise<{
    success: boolean;
    message: string;
    membership: Membership;
  }> {
    const { profile } = await this.requireAdmin(authHeader);

    this.logger.log(`Admin ${profile?.email} cancelling auto-renewal for membership ${membershipId}`);

    return this.membershipsService.cancelAutoRenewal(
      membershipId,
      data.reason || 'Cancelled by admin',
      profile?.id || 'unknown',
      data.cancelImmediately || false,
    );
  }

  /**
   * Admin: Enable auto-renewal for a membership by creating a Stripe subscription
   */
  @Post(':id/admin/enable-auto-renewal')
  @HttpCode(HttpStatus.OK)
  async adminEnableAutoRenewal(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<{
    success: boolean;
    message: string;
    checkoutUrl?: string;
    membership: Membership;
  }> {
    const { profile } = await this.requireAdmin(authHeader);

    this.logger.log(`Admin ${profile?.email} enabling auto-renewal for membership ${membershipId}`);

    return this.membershipsService.enableAutoRenewal(membershipId, profile?.id || 'unknown');
  }

  /**
   * Member: Disable auto-renewal (cancel subscription at period end)
   */
  @Post(':id/disable-auto-renewal')
  @HttpCode(HttpStatus.OK)
  async memberDisableAutoRenewal(
    @Param('id') membershipId: string,
    @Headers('authorization') authHeader: string,
    @Body() data: { reason?: string },
  ): Promise<{
    success: boolean;
    message: string;
    effectiveEndDate?: Date;
  }> {
    const { user } = await this.getAuthenticatedUser(authHeader);
    const membership = await this.membershipsService.findById(membershipId);

    if (membership.user.id !== user.id) {
      throw new ForbiddenException('You can only modify your own membership');
    }

    const result = await this.membershipsService.cancelAutoRenewal(
      membershipId,
      data.reason || 'Member disabled auto-renewal',
      user.id,
      false, // Don't cancel immediately, cancel at period end
    );

    return {
      success: true,
      message: 'Auto-renewal has been disabled. Your membership will remain active until the end of your current billing period.',
      effectiveEndDate: result.membership.endDate,
    };
  }

  /**
   * Member: Get Stripe billing portal URL to manage their subscription
   */
  @Post('billing-portal')
  @HttpCode(HttpStatus.OK)
  async getBillingPortalUrl(
    @Headers('authorization') authHeader: string,
    @Body() data: { returnUrl?: string },
  ): Promise<{
    url: string;
  }> {
    const { user } = await this.getAuthenticatedUser(authHeader);

    const returnUrl = data.returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;

    return this.membershipsService.createBillingPortalSession(user.id, returnUrl);
  }
}
