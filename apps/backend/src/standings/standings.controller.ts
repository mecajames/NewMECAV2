import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Headers,
  ForbiddenException,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { StandingsService } from './standings.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

@Controller('api/standings')
export class StandingsController {
  constructor(
    private readonly standingsService: StandingsService,
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
   * Get overall season leaderboard
   * GET /api/standings/leaderboard
   * GET /api/standings/leaderboard?seasonId=xxx&limit=100&offset=0
   */
  @Get('leaderboard')
  async getSeasonLeaderboard(
    @Query('seasonId') seasonId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.standingsService.getSeasonLeaderboard(seasonId, parsedLimit, parsedOffset);
  }

  /**
   * Get standings by format (SPL, SQL, SSI, MK)
   * GET /api/standings/format/:format
   */
  @Get('format/:format')
  async getStandingsByFormat(
    @Param('format') format: string,
    @Query('seasonId') seasonId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.standingsService.getStandingsByFormat(format, seasonId, parsedLimit);
  }

  /**
   * Get standings by competition class within a format
   * GET /api/standings/format/:format/class/:className
   */
  @Get('format/:format/class/:className')
  async getStandingsByClass(
    @Param('format') format: string,
    @Param('className') className: string,
    @Query('seasonId') seasonId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.standingsService.getStandingsByClass(format, className, seasonId, parsedLimit);
  }

  /**
   * Get team standings
   * GET /api/standings/teams
   */
  @Get('teams')
  async getTeamStandings(
    @Query('seasonId') seasonId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.standingsService.getTeamStandings(seasonId, parsedLimit);
  }

  /**
   * Get format summaries (all formats overview)
   * GET /api/standings/formats
   */
  @Get('formats')
  async getFormatSummaries(@Query('seasonId') seasonId?: string) {
    return this.standingsService.getFormatSummaries(seasonId);
  }

  /**
   * Get competitor statistics
   * GET /api/standings/competitor/:mecaId
   */
  @Get('competitor/:mecaId')
  async getCompetitorStats(
    @Param('mecaId') mecaId: string,
    @Query('seasonId') seasonId?: string,
  ) {
    return this.standingsService.getCompetitorStats(mecaId, seasonId);
  }

  /**
   * Get classes with results (for dropdown/filter options)
   * GET /api/standings/classes
   * GET /api/standings/classes?format=SPL
   */
  @Get('classes')
  async getClassesWithResults(
    @Query('format') format?: string,
    @Query('seasonId') seasonId?: string,
  ) {
    return this.standingsService.getClassesWithResults(format, seasonId);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Clear standings cache (admin only)
   * POST /api/standings/cache/clear
   */
  @Post('cache/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCache(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    this.standingsService.clearCache();
  }

  /**
   * Warm standings cache (admin only)
   * POST /api/standings/cache/warm
   */
  @Post('cache/warm')
  async warmCache(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    await this.standingsService.warmStandingsCache();
    return { message: 'Cache warmed successfully' };
  }
}
