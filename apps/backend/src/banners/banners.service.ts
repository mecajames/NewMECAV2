import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import {
  BannerPosition,
  BannerStatus,
  BannerSize,
  CreateBannerDto,
  UpdateBannerDto,
  PublicBanner,
  BannerAnalytics,
  BannerAnalyticsFilter,
} from '@newmeca/shared';
import { Banner } from './entities/banner.entity';
import { BannerEngagement } from './entities/banner-engagement.entity';
import { Advertiser } from './entities/advertiser.entity';

@Injectable()
export class BannersService {
  private readonly logger = new Logger(BannersService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // =============================================================================
  // ADMIN CRUD OPERATIONS
  // =============================================================================

  async findAll(): Promise<Banner[]> {
    const em = this.em.fork();
    return em.find(Banner, {}, {
      populate: ['advertiser'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Banner> {
    const em = this.em.fork();
    const banner = await em.findOne(Banner, { id }, { populate: ['advertiser'] });
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async create(dto: CreateBannerDto): Promise<Banner> {
    const em = this.em.fork();

    const advertiser = await em.findOne(Advertiser, { id: dto.advertiserId });
    if (!advertiser) {
      throw new NotFoundException(`Advertiser with ID ${dto.advertiserId} not found`);
    }

    const now = new Date();
    const banner = em.create(Banner, {
      name: dto.name,
      imageUrl: dto.imageUrl,
      clickUrl: dto.clickUrl || undefined,
      position: dto.position,
      status: dto.status ?? BannerStatus.DRAFT,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      priority: dto.priority ?? 0,
      advertiser,
      altText: dto.altText,
      size: dto.size || undefined,
      maxImpressionsPerUser: dto.maxImpressionsPerUser ?? 0,
      maxTotalImpressions: dto.maxTotalImpressions ?? 0,
      rotationWeight: dto.rotationWeight ?? 100,
      createdAt: now,
      updatedAt: now,
    });

    await em.persistAndFlush(banner);
    return banner;
  }

  async update(id: string, dto: UpdateBannerDto): Promise<Banner> {
    const em = this.em.fork();
    const banner = await em.findOne(Banner, { id }, { populate: ['advertiser'] });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    if (dto.advertiserId) {
      const advertiser = await em.findOne(Advertiser, { id: dto.advertiserId });
      if (!advertiser) {
        throw new NotFoundException(`Advertiser with ID ${dto.advertiserId} not found`);
      }
      banner.advertiser = advertiser;
    }

    wrap(banner).assign({
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.clickUrl !== undefined && { clickUrl: dto.clickUrl || undefined }),
      ...(dto.position !== undefined && { position: dto.position }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.altText !== undefined && { altText: dto.altText }),
      ...(dto.size !== undefined && { size: dto.size || undefined }),
      ...(dto.maxImpressionsPerUser !== undefined && { maxImpressionsPerUser: dto.maxImpressionsPerUser }),
      ...(dto.maxTotalImpressions !== undefined && { maxTotalImpressions: dto.maxTotalImpressions }),
      ...(dto.rotationWeight !== undefined && { rotationWeight: dto.rotationWeight }),
    });

    await em.flush();
    return banner;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const banner = await em.findOne(Banner, { id });
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    await em.removeAndFlush(banner);
  }

  // =============================================================================
  // PUBLIC ENDPOINTS
  // =============================================================================

  async getActiveBanner(position: BannerPosition): Promise<PublicBanner | null> {
    const banners = await this.getAllActiveBanners(position);

    if (banners.length === 0) {
      return null;
    }

    if (banners.length === 1) {
      return banners[0];
    }

    // Multiple banners - use weighted random selection
    // Note: We need to get the full banner data for weights
    const em = this.em.fork();
    const fullBanners = await em.find(Banner, {
      id: { $in: banners.map(b => b.id) },
    });

    const totalWeight = fullBanners.reduce((sum, b) => sum + b.rotationWeight, 0);
    let random = Math.random() * totalWeight;

    for (const banner of fullBanners) {
      random -= banner.rotationWeight;
      if (random <= 0) {
        return banners.find(b => b.id === banner.id) || banners[0];
      }
    }

    return banners[0];
  }

  /**
   * Get ALL active banners for a position (for rotation across multiple slots on same page)
   * Returns banners shuffled for fair distribution
   */
  async getAllActiveBanners(position: BannerPosition): Promise<PublicBanner[]> {
    const em = this.em.fork();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all eligible banners for this position
    const banners = await em.find(Banner, {
      position,
      status: BannerStatus.ACTIVE,
      startDate: { $lte: today },
      endDate: { $gte: today },
    }, {
      orderBy: { priority: 'DESC', createdAt: 'DESC' },
      populate: ['engagements'],
    });

    if (banners.length === 0) {
      return [];
    }

    // Filter out banners that have reached their total impression cap
    const eligibleBanners: Banner[] = [];
    for (const banner of banners) {
      if (banner.maxTotalImpressions > 0) {
        const totalImpressions = banner.engagements
          .getItems()
          .reduce((sum, e) => sum + e.impressions, 0);

        if (totalImpressions >= banner.maxTotalImpressions) {
          this.logger.debug(`Banner ${banner.id} has reached max total impressions (${totalImpressions}/${banner.maxTotalImpressions})`);
          continue;
        }
      }
      eligibleBanners.push(banner);
    }

    // Shuffle the banners for fair distribution
    const shuffled = [...eligibleBanners].sort(() => Math.random() - 0.5);

    return shuffled.map(banner => ({
      id: banner.id,
      imageUrl: banner.imageUrl,
      clickUrl: banner.clickUrl || null,
      altText: banner.altText || null,
      size: banner.size || null,
      maxImpressionsPerUser: banner.maxImpressionsPerUser,
    }));
  }

  /**
   * Get total impressions for a banner (used for frequency capping display)
   */
  async getTotalImpressions(bannerId: string): Promise<number> {
    const em = this.em.fork();
    const engagements = await em.find(BannerEngagement, { banner: bannerId });
    return engagements.reduce((sum, e) => sum + e.impressions, 0);
  }

  // =============================================================================
  // ENGAGEMENT TRACKING
  // =============================================================================

  async recordEngagement(bannerId: string, type: 'impression' | 'click'): Promise<void> {
    const em = this.em.fork();

    const banner = await em.findOne(Banner, { id: bannerId });
    if (!banner) {
      // Silently fail - don't expose banner existence
      this.logger.warn(`Attempted to record engagement for non-existent banner: ${bannerId}`);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let engagement = await em.findOne(BannerEngagement, {
      banner,
      date: today,
    });

    if (!engagement) {
      engagement = em.create(BannerEngagement, {
        banner,
        date: today,
        impressions: 0,
        clicks: 0,
        createdAt: today,
        updatedAt: today,
      });
      em.persist(engagement);
    }

    if (type === 'impression') {
      engagement.impressions += 1;
    } else {
      engagement.clicks += 1;
    }

    await em.flush();
  }

  // =============================================================================
  // ANALYTICS
  // =============================================================================

  async getBannerAnalytics(
    bannerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BannerAnalytics> {
    const em = this.em.fork();
    const banner = await em.findOne(Banner, { id: bannerId }, { populate: ['advertiser'] });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${bannerId} not found`);
    }

    const queryStartDate = startDate || banner.startDate;
    const queryEndDate = endDate || new Date();

    const engagements = await em.find(BannerEngagement, {
      banner,
      date: { $gte: queryStartDate, $lte: queryEndDate },
    }, {
      orderBy: { date: 'ASC' },
    });

    const totalImpressions = engagements.reduce((sum, e) => sum + e.impressions, 0);
    const totalClicks = engagements.reduce((sum, e) => sum + e.clicks, 0);
    const clickThroughRate = totalImpressions > 0
      ? (totalClicks / totalImpressions) * 100
      : 0;

    return {
      bannerId: banner.id,
      bannerName: banner.name,
      advertiserName: banner.advertiser.companyName,
      advertiserId: banner.advertiser.id,
      bannerSize: banner.size || null,
      totalImpressions,
      totalClicks,
      clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      dailyStats: engagements.map(e => ({
        date: e.date,
        impressions: e.impressions,
        clicks: e.clicks,
      })),
    };
  }

  async getAllBannersAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<BannerAnalytics[]> {
    const banners = await this.findAll();
    return Promise.all(
      banners.map(banner => this.getBannerAnalytics(banner.id, startDate, endDate)),
    );
  }

  async getFilteredBannersAnalytics(
    filter: BannerAnalyticsFilter,
  ): Promise<BannerAnalytics[]> {
    const em = this.em.fork();

    const where: Record<string, any> = {};
    if (filter.advertiserId) {
      where.advertiser = filter.advertiserId;
    }
    if (filter.size) {
      where.size = filter.size;
    }

    const banners = await em.find(Banner, where, {
      populate: ['advertiser'],
      orderBy: { createdAt: 'DESC' },
    });

    const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
    const endDate = filter.endDate ? new Date(filter.endDate) : undefined;

    return Promise.all(
      banners.map(banner => this.getBannerAnalytics(banner.id, startDate, endDate)),
    );
  }

  /**
   * Auto-detect and update sizes for banners that don't have a size set.
   * Fetches each banner's image and checks dimensions against known BannerSize values.
   */
  async autoDetectBannerSizes(): Promise<{ updated: number; failed: string[] }> {
    const em = this.em.fork();
    const banners = await em.find(Banner, { size: null });

    const sizeMap: Record<string, BannerSize> = {};
    for (const val of Object.values(BannerSize)) {
      sizeMap[val] = val;
    }

    let updated = 0;
    const failed: string[] = [];

    for (const banner of banners) {
      try {
        const dimensions = await this.getImageDimensions(banner.imageUrl);
        if (!dimensions) {
          failed.push(`${banner.name}: could not load image`);
          continue;
        }

        const sizeKey = `${dimensions.width}x${dimensions.height}`;
        const matchedSize = sizeMap[sizeKey];

        if (matchedSize) {
          banner.size = matchedSize;
          updated++;
          this.logger.log(`Banner "${banner.name}" auto-detected as ${sizeKey}`);
        } else {
          failed.push(`${banner.name}: ${sizeKey} is not a standard size`);
        }
      } catch (err) {
        failed.push(`${banner.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }

    await em.flush();
    return { updated, failed };
  }

  private async getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
    try {
      // Use probe-image-size or fetch + buffer approach
      // For simplicity, fetch the image headers/data and decode dimensions
      const response = await fetch(url);
      if (!response.ok) return null;

      const buffer = Buffer.from(await response.arrayBuffer());
      return this.parseImageDimensions(buffer);
    } catch {
      return null;
    }
  }

  private parseImageDimensions(buffer: Buffer): { width: number; height: number } | null {
    // PNG: bytes 16-23 contain width and height as 4-byte big-endian integers
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // JPEG: search for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 9) {
        if (buffer[offset] !== 0xFF) { offset++; continue; }
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const segLen = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }

    // GIF: bytes 6-9 contain width and height as 2-byte little-endian
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }

    // WebP: RIFF header, then check VP8 chunk
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      // VP8 (lossy)
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
        const width = buffer.readUInt16LE(26) & 0x3FFF;
        const height = buffer.readUInt16LE(28) & 0x3FFF;
        return { width, height };
      }
      // VP8L (lossless)
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4C) {
        const bits = buffer.readUInt32LE(21);
        const width = (bits & 0x3FFF) + 1;
        const height = ((bits >> 14) & 0x3FFF) + 1;
        return { width, height };
      }
      // VP8X (extended)
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
        const width = (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
        const height = (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1;
        return { width, height };
      }
    }

    return null;
  }
}
