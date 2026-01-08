import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WorldFinalsService } from './world-finals.service';
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
}
