import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PointsConfiguration } from './points-configuration.entity';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';

// Define the update DTO interface locally to avoid import issues
interface UpdatePointsConfigurationDto {
  standard_1st_place?: number;
  standard_2nd_place?: number;
  standard_3rd_place?: number;
  standard_4th_place?: number;
  standard_5th_place?: number;
  four_x_1st_place?: number;
  four_x_2nd_place?: number;
  four_x_3rd_place?: number;
  four_x_4th_place?: number;
  four_x_5th_place?: number;
  four_x_extended_enabled?: boolean;
  four_x_extended_points?: number;
  four_x_extended_max_place?: number;
  is_active?: boolean;
  description?: string | null;
}

@Injectable()
export class PointsConfigurationService {
  private readonly logger = new Logger(PointsConfigurationService.name);

  // Cache for points configuration per season
  private configCache: Map<string, { config: PointsConfiguration; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute cache

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Get the active points configuration for a season
   * Uses caching to reduce database queries
   */
  async getConfigForSeason(seasonId: string): Promise<PointsConfiguration> {
    // Check cache first
    const cached = this.configCache.get(seasonId);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      return cached.config;
    }

    const em = this.em.fork();

    // Find config for this season
    let config = await em.findOne(PointsConfiguration, { season: seasonId }, {
      populate: ['season'],
    });

    // If no config exists, create default
    if (!config) {
      this.logger.log(`Creating default points configuration for season ${seasonId}`);
      config = await this.createDefaultConfig(seasonId);
    }

    // Update cache
    this.configCache.set(seasonId, { config, timestamp: now });

    return config;
  }

  /**
   * Get config for the current active season
   */
  async getConfigForCurrentSeason(): Promise<PointsConfiguration | null> {
    const em = this.em.fork();

    // Find current season
    const currentSeason = await em.findOne(Season, { isCurrent: true });
    if (!currentSeason) {
      return null;
    }

    return this.getConfigForSeason(currentSeason.id);
  }

  /**
   * Get all configurations (for admin view)
   */
  async findAll(): Promise<PointsConfiguration[]> {
    const em = this.em.fork();
    return em.find(PointsConfiguration, {}, {
      populate: ['season'],
      orderBy: { season: { year: 'DESC' } },
    });
  }

  /**
   * Get config by ID
   */
  async findById(id: string): Promise<PointsConfiguration> {
    const em = this.em.fork();
    const config = await em.findOne(PointsConfiguration, { id }, {
      populate: ['season'],
    });

    if (!config) {
      throw new NotFoundException(`Points configuration with ID ${id} not found`);
    }

    return config;
  }

  /**
   * Update points configuration for a season
   */
  async update(
    seasonId: string,
    data: UpdatePointsConfigurationDto,
    userId?: string,
  ): Promise<PointsConfiguration> {
    const em = this.em.fork();

    // Find or create config for this season
    let config = await em.findOne(PointsConfiguration, { season: seasonId }, {
      populate: ['season'],
    });

    if (!config) {
      config = await this.createDefaultConfig(seasonId);
    }

    // Map snake_case DTO to camelCase entity properties
    const updateData: Partial<PointsConfiguration> = {};

    if (data.standard_1st_place !== undefined) updateData.standard1stPlace = data.standard_1st_place;
    if (data.standard_2nd_place !== undefined) updateData.standard2ndPlace = data.standard_2nd_place;
    if (data.standard_3rd_place !== undefined) updateData.standard3rdPlace = data.standard_3rd_place;
    if (data.standard_4th_place !== undefined) updateData.standard4thPlace = data.standard_4th_place;
    if (data.standard_5th_place !== undefined) updateData.standard5thPlace = data.standard_5th_place;

    if (data.four_x_1st_place !== undefined) updateData.fourX1stPlace = data.four_x_1st_place;
    if (data.four_x_2nd_place !== undefined) updateData.fourX2ndPlace = data.four_x_2nd_place;
    if (data.four_x_3rd_place !== undefined) updateData.fourX3rdPlace = data.four_x_3rd_place;
    if (data.four_x_4th_place !== undefined) updateData.fourX4thPlace = data.four_x_4th_place;
    if (data.four_x_5th_place !== undefined) updateData.fourX5thPlace = data.four_x_5th_place;

    if (data.four_x_extended_enabled !== undefined) updateData.fourXExtendedEnabled = data.four_x_extended_enabled;
    if (data.four_x_extended_points !== undefined) updateData.fourXExtendedPoints = data.four_x_extended_points;
    if (data.four_x_extended_max_place !== undefined) updateData.fourXExtendedMaxPlace = data.four_x_extended_max_place;

    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.description !== undefined) updateData.description = data.description ?? undefined;

    // Set updated_by if userId provided
    if (userId) {
      const profile = await em.findOne(Profile, { id: userId });
      if (profile) {
        updateData.updatedBy = profile;
      }
    }

    em.assign(config, updateData);
    await em.flush();

    // Invalidate cache for this season
    this.invalidateCache(seasonId);

    this.logger.log(`Updated points configuration for season ${seasonId}`);

    return config;
  }

  /**
   * Create default configuration for a season
   */
  private async createDefaultConfig(seasonId: string): Promise<PointsConfiguration> {
    const em = this.em.fork();

    const season = await em.findOne(Season, { id: seasonId });
    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    const config = new PointsConfiguration();
    config.season = season;
    config.standard1stPlace = 5;
    config.standard2ndPlace = 4;
    config.standard3rdPlace = 3;
    config.standard4thPlace = 2;
    config.standard5thPlace = 1;
    config.fourX1stPlace = 30;
    config.fourX2ndPlace = 27;
    config.fourX3rdPlace = 24;
    config.fourX4thPlace = 21;
    config.fourX5thPlace = 18;
    config.fourXExtendedEnabled = false;
    config.fourXExtendedPoints = 15;
    config.fourXExtendedMaxPlace = 50;
    config.isActive = true;
    config.description = `Default configuration for ${season.name}`;

    await em.persistAndFlush(config);

    return config;
  }

  /**
   * Invalidate cache for a specific season
   */
  invalidateCache(seasonId: string): void {
    this.configCache.delete(seasonId);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAllCache(): void {
    this.configCache.clear();
  }

  /**
   * Calculate points for a placement based on configuration
   *
   * @param placement - The competitor's placement (1st, 2nd, etc.)
   * @param multiplier - The event's points multiplier (1, 2, 3, or 4)
   * @param config - The points configuration to use
   * @returns The calculated points
   */
  calculatePoints(placement: number, multiplier: number, config: PointsConfiguration): number {
    // No points for non-competitive events (multiplier 0)
    if (multiplier === 0) {
      return 0;
    }

    // 4X Events - Special scoring
    if (multiplier === 4) {
      // Top 5 placements
      if (placement >= 1 && placement <= 5) {
        const fourXPoints: { [key: number]: number } = {
          1: config.fourX1stPlace,
          2: config.fourX2ndPlace,
          3: config.fourX3rdPlace,
          4: config.fourX4thPlace,
          5: config.fourX5thPlace,
        };
        return fourXPoints[placement] || 0;
      }

      // Extended placements (6th - max_place) when enabled
      if (config.fourXExtendedEnabled && placement >= 6 && placement <= config.fourXExtendedMaxPlace) {
        return config.fourXExtendedPoints;
      }

      // No points beyond max extended place
      return 0;
    }

    // Standard events (1X, 2X, 3X) - Only top 5 get points
    if (placement < 1 || placement > 5) {
      return 0;
    }

    // Base points multiplied by event multiplier
    const basePoints: { [key: number]: number } = {
      1: config.standard1stPlace,
      2: config.standard2ndPlace,
      3: config.standard3rdPlace,
      4: config.standard4thPlace,
      5: config.standard5thPlace,
    };

    return (basePoints[placement] || 0) * multiplier;
  }

  /**
   * Generate points preview for all placements
   * Useful for admin UI to show what points would be awarded
   */
  generatePointsPreview(config: PointsConfiguration): Array<{
    placement: number;
    standard_1x: number;
    standard_2x: number;
    standard_3x: number;
    four_x: number;
  }> {
    const preview = [];

    // Standard placements 1-5
    for (let i = 1; i <= 5; i++) {
      preview.push({
        placement: i,
        standard_1x: this.calculatePoints(i, 1, config),
        standard_2x: this.calculatePoints(i, 2, config),
        standard_3x: this.calculatePoints(i, 3, config),
        four_x: this.calculatePoints(i, 4, config),
      });
    }

    // Extended 4X placements if enabled
    if (config.fourXExtendedEnabled) {
      // Show 6th place as representative
      preview.push({
        placement: 6,
        standard_1x: 0,
        standard_2x: 0,
        standard_3x: 0,
        four_x: config.fourXExtendedPoints,
      });

      // Show max place
      if (config.fourXExtendedMaxPlace > 6) {
        preview.push({
          placement: config.fourXExtendedMaxPlace,
          standard_1x: 0,
          standard_2x: 0,
          standard_3x: 0,
          four_x: config.fourXExtendedPoints,
        });
      }
    }

    return preview;
  }
}
