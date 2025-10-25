import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { DirectoryListing } from './directory.entity';
import { ENTITY_MANAGER } from '../db/database.module';

@Injectable()
export class DirectoriesService {
  constructor(@Inject(ENTITY_MANAGER) private readonly em: EntityManager) {}

  async findAll(type?: string) {
    const where: any = { active: true };
    if (type) where.directoryType = type;
    return this.em.find(DirectoryListing, where, {
      orderBy: { featured: 'DESC', displayOrder: 'ASC' },
    });
  }

  async findById(id: string) {
    return this.em.findOne(DirectoryListing, { id });
  }

  async findByProfile(profileId: string) {
    return this.em.findOne(DirectoryListing, { profile: profileId });
  }

  async create(data: Partial<DirectoryListing>) {
    const listing = this.em.create(DirectoryListing, data);
    await this.em.persistAndFlush(listing);
    return listing;
  }

  async update(id: string, data: Partial<DirectoryListing>) {
    const listing = await this.em.findOneOrFail(DirectoryListing, { id });
    this.em.assign(listing, data);
    await this.em.flush();
    return listing;
  }

  async delete(id: string) {
    const listing = await this.em.findOneOrFail(DirectoryListing, { id });
    await this.em.removeAndFlush(listing);
  }

  async getFeatured(type?: string) {
    const where: any = { active: true, featured: true };
    if (type) where.directoryType = type;
    return this.em.find(DirectoryListing, where, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async setFeatured(id: string, featured: boolean) {
    const listing = await this.em.findOneOrFail(DirectoryListing, { id });
    listing.featured = featured;
    await this.em.flush();
    return listing;
  }
}
