import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  Post,
  Logger,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { PointsConfigurationService } from './points-configuration.service';
import { UpdatePointsConfigurationSchema, UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';

@Controller('api/points-configuration')
export class PointsConfigurationController {
  private readonly logger = new Logger(PointsConfigurationController.name);

  constructor(
    private readonly pointsConfigService: PointsConfigurationService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string): Promise<Profile> {
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

    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    if (profile.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return profile;
  }

  /**
   * Get all points configurations (admin only)
   */
  @Get()
  async findAll(@Headers('authorization') authHeader?: string) {
    await this.requireAdmin(authHeader);
    const configs = await this.pointsConfigService.findAll();
    return configs.map(c => c.toJSON());
  }

  /**
   * Get points configuration for current season (public)
   */
  @Get('current')
  async getCurrentSeasonConfig() {
    const config = await this.pointsConfigService.getConfigForCurrentSeason();
    if (!config) {
      return { message: 'No current season found', config: null };
    }
    return config.toJSON();
  }

  /**
   * Get points configuration by season ID
   */
  @Get('season/:seasonId')
  async getConfigForSeason(@Param('seasonId') seasonId: string) {
    const config = await this.pointsConfigService.getConfigForSeason(seasonId);
    return config.toJSON();
  }

  /**
   * Get points preview for a season
   * Shows calculated points for all placements
   */
  @Get('season/:seasonId/preview')
  async getPointsPreview(@Param('seasonId') seasonId: string) {
    const config = await this.pointsConfigService.getConfigForSeason(seasonId);
    const preview = this.pointsConfigService.generatePointsPreview(config);
    return {
      season_id: seasonId,
      config: config.toJSON(),
      preview,
    };
  }

  /**
   * Get points configuration by ID (admin only)
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    await this.requireAdmin(authHeader);
    const config = await this.pointsConfigService.findById(id);
    return config.toJSON();
  }

  /**
   * Update points configuration for a season (admin only)
   */
  @Put('season/:seasonId')
  async updateSeasonConfig(
    @Param('seasonId') seasonId: string,
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
  ) {
    const profile = await this.requireAdmin(authHeader);

    // Validate input
    const validationResult = UpdatePointsConfigurationSchema.safeParse(body);
    if (!validationResult.success) {
      return {
        error: 'Validation failed',
        details: validationResult.error.errors,
      };
    }

    const config = await this.pointsConfigService.update(seasonId, validationResult.data, profile.id);

    this.logger.log(`Points configuration updated for season ${seasonId} by user ${profile.id}`);

    return {
      message: 'Points configuration updated successfully',
      config: config.toJSON(),
    };
  }

  /**
   * Update points configuration and trigger recalculation (admin only)
   */
  @Put('season/:seasonId/recalculate')
  async updateAndRecalculate(
    @Param('seasonId') seasonId: string,
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
  ) {
    const profile = await this.requireAdmin(authHeader);

    // Validate input
    const { recalculate, ...updateData } = body;
    const validationResult = UpdatePointsConfigurationSchema.safeParse(updateData);
    if (!validationResult.success) {
      return {
        error: 'Validation failed',
        details: validationResult.error.errors,
      };
    }

    // Update the configuration
    const config = await this.pointsConfigService.update(seasonId, validationResult.data, profile.id);

    this.logger.log(`Points configuration updated for season ${seasonId} by user ${profile.id}`);

    // Note: Recalculation will be handled by the caller (competition-results service)
    // We return a flag indicating whether recalculation was requested
    return {
      message: 'Points configuration updated successfully',
      config: config.toJSON(),
      recalculation_requested: recalculate === true,
    };
  }

  /**
   * Calculate points for a specific placement (utility endpoint)
   */
  @Get('calculate')
  async calculatePoints(
    @Query('seasonId') seasonId: string,
    @Query('placement') placement: string,
    @Query('multiplier') multiplier: string,
  ) {
    if (!seasonId || !placement || !multiplier) {
      return { error: 'Missing required parameters: seasonId, placement, multiplier' };
    }

    const config = await this.pointsConfigService.getConfigForSeason(seasonId);
    const points = this.pointsConfigService.calculatePoints(
      parseInt(placement, 10),
      parseInt(multiplier, 10),
      config,
    );

    return {
      season_id: seasonId,
      placement: parseInt(placement, 10),
      multiplier: parseInt(multiplier, 10),
      points,
    };
  }

  /**
   * Invalidate cache (admin only - useful after manual DB changes)
   */
  @Post('invalidate-cache')
  async invalidateCache(
    @Query('seasonId') seasonId?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    await this.requireAdmin(authHeader);

    if (seasonId) {
      this.pointsConfigService.invalidateCache(seasonId);
      return { message: `Cache invalidated for season ${seasonId}` };
    } else {
      this.pointsConfigService.invalidateAllCache();
      return { message: 'All cache invalidated' };
    }
  }
}
