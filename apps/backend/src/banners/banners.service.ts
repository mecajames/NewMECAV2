import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import {
  BannerPosition,
  BannerStatus,
  CreateBannerDto,
  UpdateBannerDto,
  PublicBanner,
  BannerAnalytics,
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
}
