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
import { AdminCreateMembershipDto, AdminCreateMembershipSchema, UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { ZodError } from 'zod';
import { MembershipsService, AdminAssignMembershipDto, CreateMembershipDto, AdminCreateMembershipResult } from './memberships.service';
import { Membership } from './memberships.entity';
import { MecaIdService } from './meca-id.service';
import { MasterSecondaryService, CreateSecondaryMembershipDto, SecondaryMembershipInfo, MasterMembershipInfo } from './master-secondary.service';

@Controller('api/memberships')
export class MembershipsController {
  private readonly logger = new Logger(MembershipsController.name);

  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly mecaIdService: MecaIdService,
    private readonly masterSecondaryService: MasterSecondaryService,
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
   * Get all MECA IDs controlled by a user (their own + all secondaries)
   */
  @Get('user/:userId/controlled-meca-ids')
  async getControlledMecaIds(
    @Param('userId') userId: string,
  ): Promise<Array<{ mecaId: number; membershipId: string; competitorName: string; isOwn: boolean }>> {
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
}
