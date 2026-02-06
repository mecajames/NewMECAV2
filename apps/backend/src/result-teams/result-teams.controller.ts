import {
  Controller,
  Get,
  Post,
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
import { ResultTeamsService, CreateResultTeamDto } from './result-teams.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

@Controller('api/result-teams')
export class ResultTeamsController {
  constructor(
    private readonly resultTeamsService: ResultTeamsService,
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

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Get result teams for a specific result
   */
  @Get('result/:resultId')
  async getResultTeamsByResult(@Param('resultId') resultId: string) {
    return this.resultTeamsService.getResultTeamsByResultId(resultId);
  }

  /**
   * Get result teams for a specific team
   */
  @Get('team/:teamId')
  async getResultTeamsByTeam(@Param('teamId') teamId: string) {
    return this.resultTeamsService.getResultTeamsByTeamId(teamId);
  }

  /**
   * Get result teams for a team in a specific season
   */
  @Get('team/:teamId/season/:seasonId')
  async getTeamResultsForSeason(
    @Param('teamId') teamId: string,
    @Param('seasonId') seasonId: string,
  ) {
    return this.resultTeamsService.getTeamResultsForSeason(teamId, seasonId);
  }

  /**
   * Get team standings for a season
   */
  @Get('standings/season/:seasonId')
  async getTeamStandings(
    @Param('seasonId') seasonId: string,
    @Query('limit') limit?: number,
  ) {
    return this.resultTeamsService.getTopTeamsBySeason(seasonId, limit || 10);
  }

  /**
   * Get total points for a team in a season
   */
  @Get('team/:teamId/season/:seasonId/points')
  async getTeamPointsForSeason(
    @Param('teamId') teamId: string,
    @Param('seasonId') seasonId: string,
  ) {
    const totalPoints = await this.resultTeamsService.getTeamPointsForSeason(teamId, seasonId);
    return { teamId, seasonId, totalPoints };
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Create a result team entry (admin only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createResultTeam(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateResultTeamDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.resultTeamsService.createResultTeam(data);
  }

  /**
   * Delete a result team entry (admin only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResultTeam(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.resultTeamsService.deleteResultTeam(id);
  }

  /**
   * Get all teams with their members (admin only)
   * Useful for debugging team membership issues
   */
  @Get('admin/teams-with-members')
  async getAllTeamsWithMembers(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.resultTeamsService.getAllTeamsWithMembers();
  }

  /**
   * Sync all existing competition results to teams (admin only)
   * This is a one-time migration to populate existing data
   */
  @Post('admin/sync-all')
  @HttpCode(HttpStatus.OK)
  async syncAllResultsToTeams(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.resultTeamsService.syncAllResultsToTeams();
  }
}
