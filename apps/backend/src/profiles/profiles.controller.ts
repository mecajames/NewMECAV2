import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProfilesService, CreateUserWithPasswordDto, ResetPasswordDto, EnsureProfileDto } from './profiles.service';
import { MemberStatsService } from './member-stats.service';
import { Profile } from './profiles.entity';
import { calculatePasswordStrength, MIN_PASSWORD_STRENGTH } from '../utils/password-generator';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { UserRole } from '@newmeca/shared';

@Controller('api/profiles')
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly memberStatsService: MemberStatsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
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
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  // Helper to require any authenticated user (not necessarily admin)
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

  // ===== Ensure Profile Endpoint =====

  /**
   * Ensures a profile exists for the authenticated user.
   * If the profile already exists, returns it. Otherwise creates a new one.
   * Called during signup/OAuth flows. Validates that the userId in the body
   * matches the authenticated user from the auth token.
   */
  @Post('ensure')
  @HttpCode(HttpStatus.OK)
  async ensureProfile(
    @Headers('authorization') authHeader: string,
    @Body() body: EnsureProfileDto,
  ): Promise<Profile> {
    const authUser = await this.requireAuthUser(authHeader);

    // Validate that the userId in the body matches the authenticated user
    if (body.userId !== authUser.id) {
      throw new ForbiddenException('userId does not match authenticated user');
    }

    return this.profilesService.ensureProfile(body.userId);
  }

  @Get()
  async listProfiles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<Profile[]> {
    return this.profilesService.findAll(page, limit);
  }

  @Get('search')
  async searchProfiles(
    @Query('q') query: string,
    @Query('limit') limit: number = 20,
  ): Promise<Profile[]> {
    return this.profilesService.search(query, limit);
  }

  @Get('stats')
  async getStats(): Promise<{ totalUsers: number; totalMembers: number }> {
    return this.profilesService.getStats();
  }

  @Get('public')
  async getPublicProfiles(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.profilesService.findPublicProfiles({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('public/:id')
  async getPublicProfile(@Param('id') id: string): Promise<Profile> {
    return this.profilesService.findPublicById(id);
  }

  /**
   * Returns all non-secondary profiles with master profile info (admin only).
   * Used by the admin Members page.
   */
  @Get('admin/members')
  async getAdminMembers(
    @Headers('authorization') authHeader: string,
  ): Promise<Profile[]> {
    await this.requireAdmin(authHeader);
    return this.profilesService.findAdminMembers();
  }

  @Get(':id')
  async getProfile(@Param('id') id: string): Promise<Profile> {
    return this.profilesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() data: Partial<Profile>): Promise<Profile> {
    return this.profilesService.create(data);
  }

  @Put(':id')
  async updateProfile(
    @Param('id') id: string,
    @Body() data: Partial<Profile>,
  ): Promise<Profile> {
    return this.profilesService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Param('id') id: string): Promise<void> {
    return this.profilesService.delete(id);
  }

  // ===== Admin Password Management Endpoints =====

  /**
   * Creates a new user with password (admin only)
   */
  @Post('admin/create-with-password')
  @HttpCode(HttpStatus.CREATED)
  async createUserWithPassword(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateUserWithPasswordDto,
  ): Promise<Profile> {
    await this.requireAdmin(authHeader);
    return this.profilesService.createWithPassword(dto);
  }

  /**
   * Generates a secure password that meets minimum strength requirements
   */
  @Get('admin/generate-password')
  async generatePassword(
    @Headers('authorization') authHeader: string,
  ): Promise<{ password: string; strength: ReturnType<typeof calculatePasswordStrength> }> {
    await this.requireAdmin(authHeader);
    const password = this.profilesService.generatePassword();
    const strength = calculatePasswordStrength(password);
    return { password, strength };
  }

  /**
   * Checks password strength
   */
  @Post('admin/check-password-strength')
  async checkPasswordStrength(
    @Headers('authorization') authHeader: string,
    @Body() body: { password: string },
  ): Promise<{
    strength: ReturnType<typeof calculatePasswordStrength>;
    meetsMinimum: boolean;
    minimumRequired: number;
  }> {
    await this.requireAdmin(authHeader);
    const strength = calculatePasswordStrength(body.password);
    return {
      strength,
      meetsMinimum: strength.score >= MIN_PASSWORD_STRENGTH,
      minimumRequired: MIN_PASSWORD_STRENGTH,
    };
  }

  /**
   * Checks if email service is configured
   */
  @Get('admin/email-service-status')
  async getEmailServiceStatus(
    @Headers('authorization') authHeader: string,
  ): Promise<{ configured: boolean }> {
    await this.requireAdmin(authHeader);
    return { configured: this.profilesService.isEmailServiceReady() };
  }

  /**
   * Resets a user's password (admin only)
   */
  @Post(':id/reset-password')
  async resetPassword(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean; emailSent: boolean }> {
    await this.requireAdmin(authHeader);
    return this.profilesService.resetPassword(id, dto);
  }

  /**
   * Clears the force password change flag after user changes their password
   */
  @Post(':id/clear-force-password-change')
  async clearForcePasswordChange(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.profilesService.clearForcePasswordChange(id);
    return { success: true };
  }

  /**
   * Cleans up an orphaned auth user (user exists in Supabase Auth but not in profiles table)
   * Admin only - use when user creation fails partway through
   */
  @Delete('admin/cleanup-auth-user')
  @HttpCode(HttpStatus.OK)
  async cleanupOrphanedAuthUser(
    @Headers('authorization') authHeader: string,
    @Body() body: { email: string },
  ): Promise<{ success: boolean; message: string }> {
    await this.requireAdmin(authHeader);
    return this.profilesService.cleanupOrphanedAuthUser(body.email);
  }

  /**
   * Fully deletes a user from both profiles table AND Supabase Auth
   * Admin only - use for complete user removal
   */
  @Delete('admin/delete-user-completely')
  @HttpCode(HttpStatus.OK)
  async deleteUserCompletely(
    @Headers('authorization') authHeader: string,
    @Body() body: { email: string },
  ): Promise<{ success: boolean; message: string }> {
    await this.requireAdmin(authHeader);
    return this.profilesService.deleteUserCompletelyByEmail(body.email);
  }

  /**
   * Fully deletes a user by ID from profiles, memberships, and Supabase Auth
   * Admin only - comprehensive delete
   */
  @Delete('admin/delete-user/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUserById(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<{
    success: boolean;
    message: string;
    deletedMemberships?: number;
  }> {
    await this.requireAdmin(authHeader);
    return this.profilesService.deleteUserCompletelyById(id);
  }

  /**
   * Generates an impersonation link for admin to view the app as another user
   * Admin only - returns a magic link URL
   */
  @Post('admin/impersonate/:id')
  @HttpCode(HttpStatus.OK)
  async impersonateUser(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { redirectTo?: string },
  ): Promise<{ success: boolean; link?: string; error?: string }> {
    await this.requireAdmin(authHeader);
    const redirectTo = body.redirectTo || process.env.FRONTEND_URL || 'http://localhost:5173';
    return this.profilesService.generateImpersonationLink(id, redirectTo);
  }

  // ===== Member Statistics Endpoints =====

  /**
   * Get member statistics (admin only)
   * Returns order count, events attended, trophies, total spent, recent activity, etc.
   */
  @Get(':id/stats')
  async getMemberStats(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.memberStatsService.getMemberStats(id);
  }

  // ===== Judge and Event Director Permission Endpoints =====

  /**
   * Get Judge and Event Director status for a profile (admin only)
   * Returns combined status info including permissions, applications, records, and event history
   */
  @Get(':id/judge-ed-status')
  async getJudgeEdStatus(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.profilesService.getJudgeEdStatus(id);
  }

  /**
   * Update judge permission for a profile (admin only)
   */
  @Put(':id/judge-permission')
  async updateJudgePermission(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Body() body: {
      enabled: boolean;
      autoComplete?: boolean;
      expirationDate?: string | null;
      judgeLevel?: string;
    },
  ) {
    const { profile: adminProfile } = await this.requireAdmin(authHeader);
    return this.profilesService.updateJudgePermission(id, adminProfile.id, {
      enabled: body.enabled,
      autoComplete: body.autoComplete,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      judgeLevel: body.judgeLevel,
    });
  }

  /**
   * Update event director permission for a profile (admin only)
   */
  @Put(':id/ed-permission')
  async updateEventDirectorPermission(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Body() body: {
      enabled: boolean;
      autoComplete?: boolean;
      expirationDate?: string | null;
    },
  ) {
    const { profile: adminProfile } = await this.requireAdmin(authHeader);
    return this.profilesService.updateEventDirectorPermission(id, adminProfile.id, {
      enabled: body.enabled,
      autoComplete: body.autoComplete,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
    });
  }
}
