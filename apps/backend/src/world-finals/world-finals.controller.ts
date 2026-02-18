import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  WorldFinalsService,
  CreateFinalsRegistrationDto,
  UpdateFinalsRegistrationDto,
  CreateFinalsVoteDto,
} from './world-finals.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

@Controller('api/world-finals')
export class WorldFinalsController {
  constructor(
    private readonly worldFinalsService: WorldFinalsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require any authenticated user
  private async requireAuth(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id }, { fields: ['id', 'email', 'role'] as any });
    return { user, profile };
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    const { user, profile } = await this.requireAuth(authHeader);

    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  /**
   * Get qualifications for the current season (public for leaderboard highlighting)
   */
  @Get('qualifications/current')
  async getCurrentSeasonQualifications() {
    return this.worldFinalsService.getCurrentSeasonQualifications();
  }

  /**
   * Get qualifications for a specific season
   */
  @Get('qualifications/season/:seasonId')
  async getSeasonQualifications(@Param('seasonId') seasonId: string) {
    return this.worldFinalsService.getSeasonQualifications(seasonId);
  }

  /**
   * Get qualification statistics for admin dashboard
   */
  @Get('stats')
  async getQualificationStats(
    @Headers('authorization') authHeader: string,
    @Query('seasonId') seasonId?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getQualificationStats(seasonId);
  }

  /**
   * Send invitation to a specific qualified competitor
   */
  @Post('qualifications/:id/send-invitation')
  async sendInvitation(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.sendInvitation(id);
  }

  /**
   * Send invitations to all qualified competitors who haven't received one yet
   */
  @Post('send-all-invitations/:seasonId')
  async sendAllPendingInvitations(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.sendAllPendingInvitations(seasonId);
  }

  /**
   * Recalculate all qualifications for a season (admin tool)
   */
  @Post('recalculate/:seasonId')
  async recalculateSeasonQualifications(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.recalculateSeasonQualifications(seasonId);
  }

  /**
   * Redeem an invitation token (for pre-registration)
   */
  @Post('redeem-invitation')
  async redeemInvitation(@Body('token') token: string) {
    const qualification = await this.worldFinalsService.redeemInvitation(token);
    if (!qualification) {
      return { success: false, message: 'Invalid or already redeemed invitation token' };
    }
    return {
      success: true,
      qualification,
      message: 'Invitation redeemed successfully',
    };
  }

  // ============================================
  // FINALS REGISTRATION ENDPOINTS
  // ============================================

  /**
   * Create a new registration (authenticated users)
   */
  @Post('registrations')
  @HttpCode(HttpStatus.CREATED)
  async createRegistration(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateFinalsRegistrationDto,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.createRegistration(user.id, data);
  }

  /**
   * Get current user's registrations
   */
  @Get('registrations/me')
  async getMyRegistrations(@Headers('authorization') authHeader: string) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.getMyRegistrations(user.id);
  }

  /**
   * Get current user's registration for a specific season
   */
  @Get('registrations/me/season/:seasonId')
  async getMyRegistrationForSeason(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.getMyRegistration(user.id, seasonId);
  }

  /**
   * Update a registration (owner only)
   */
  @Put('registrations/:id')
  async updateRegistration(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateFinalsRegistrationDto,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.updateRegistration(id, user.id, data);
  }

  /**
   * Delete a registration (owner only)
   */
  @Delete('registrations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRegistration(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.deleteRegistration(id, user.id);
  }

  /**
   * Get all registrations for a season (admin only)
   */
  @Get('registrations/season/:seasonId')
  async getRegistrationsBySeason(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
    @Query('class') competitionClass?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getRegistrationsBySeasonAndClass(seasonId, competitionClass);
  }

  /**
   * Get registration statistics (admin only)
   */
  @Get('registrations/stats/:seasonId')
  async getRegistrationStats(
    @Headers('authorization') authHeader: string,
    @Param('seasonId') seasonId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getRegistrationStats(seasonId);
  }

  // ============================================
  // FINALS VOTING ENDPOINTS
  // ============================================

  /**
   * Submit a vote (authenticated users)
   */
  @Post('votes')
  @HttpCode(HttpStatus.CREATED)
  async submitVote(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateFinalsVoteDto,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.submitVote(user.id, data);
  }

  /**
   * Get current user's votes
   */
  @Get('votes/my-votes')
  async getMyVotes(@Headers('authorization') authHeader: string) {
    const { user } = await this.requireAuth(authHeader);
    return this.worldFinalsService.getMyVotes(user.id);
  }

  /**
   * Check if user has voted in a category
   */
  @Get('votes/check/:category')
  async checkVoteStatus(
    @Headers('authorization') authHeader: string,
    @Param('category') category: string,
  ) {
    const { user } = await this.requireAuth(authHeader);
    const hasVoted = await this.worldFinalsService.hasUserVoted(user.id, category);
    return { category, hasVoted };
  }

  /**
   * Get vote summary (admin only)
   */
  @Get('votes/summary')
  async getVoteSummary(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getVoteSummary();
  }

  /**
   * Get votes by category (admin only)
   */
  @Get('votes/category/:category')
  async getVotesByCategory(
    @Headers('authorization') authHeader: string,
    @Param('category') category: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.worldFinalsService.getVotesByCategory(category);
  }
}
