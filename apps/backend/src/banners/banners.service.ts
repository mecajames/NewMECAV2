import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BannerImage, ManufacturerAd } from './banner.entity';

@Injectable()
export class BannersService {
  constructor(private readonly em: EntityManager) {}

  // Banner Images
  async findAllBanners(type?: string) {
    const where: any = { active: true };
    if (type) where.bannerType = type;
    return this.em.find(BannerImage, where, { orderBy: { position: 'ASC' } });
  }

  async findBannerById(id: string) {
    return this.em.findOne(BannerImage, { id });
  }

  async findUserBanners(ownerId: string) {
    return this.em.find(BannerImage, { owner: ownerId });
  }

  async createBanner(data: Partial<BannerImage>) {
    const banner = this.em.create(BannerImage, data);
    await this.em.persistAndFlush(banner);
    return banner;
  }

  async updateBanner(id: string, data: Partial<BannerImage>) {
    const banner = await this.em.findOneOrFail(BannerImage, { id });
    this.em.assign(banner, data);
    await this.em.flush();
    return banner;
  }

  async deleteBanner(id: string) {
    const banner = await this.em.findOneOrFail(BannerImage, { id });
    await this.em.removeAndFlush(banner);
  }

  async trackImpression(id: string) {
    const banner = await this.em.findOneOrFail(BannerImage, { id });
    banner.impressions++;
    await this.em.flush();
  }

  async trackClick(id: string) {
    const banner = await this.em.findOneOrFail(BannerImage, { id });
    banner.clicks++;
    await this.em.flush();
  }

  // Manufacturer Ads
  async findAllAds(placement?: string) {
    const where: any = { active: true };
    if (placement) where.adPlacement = placement;
    return this.em.find(ManufacturerAd, where);
  }

  async findAdById(id: string) {
    return this.em.findOne(ManufacturerAd, { id });
  }

  async findManufacturerAds(manufacturerId: string) {
    return this.em.find(ManufacturerAd, { manufacturer: manufacturerId });
  }

  async createAd(data: Partial<ManufacturerAd>) {
    const ad = this.em.create(ManufacturerAd, data);
    await this.em.persistAndFlush(ad);
    return ad;
  }

  async updateAd(id: string, data: Partial<ManufacturerAd>) {
    const ad = await this.em.findOneOrFail(ManufacturerAd, { id });
    this.em.assign(ad, data);
    await this.em.flush();
    return ad;
  }

  async deleteAd(id: string) {
    const ad = await this.em.findOneOrFail(ManufacturerAd, { id });
    await this.em.removeAndFlush(ad);
  }
}
