import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { Profile } from './profiles.entity';
import { ENTITY_MANAGER } from '../db/database.module';

/**
 * ProfilesService
 *
 * Business logic for profile operations.
 * Uses MikroORM EntityManager for database operations.
 *
 * @Injectable decorator marks this class as available for dependency injection
 */
@Injectable()
export class ProfilesService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  /**
   * Find all profiles with pagination
   */
  async findAll(page: number = 1, limit: number = 10): Promise<Profile[]> {
    const offset = (page - 1) * limit;
    return this.em.find(Profile, {}, {
      limit,
      offset,
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Find profile by ID
   */
  async findById(id: string): Promise<Profile | null> {
    return this.em.findOne(Profile, { id });
  }

  /**
   * Find profile by email
   */
  async findByEmail(email: string): Promise<Profile | null> {
    return this.em.findOne(Profile, { email });
  }

  /**
   * Create new profile
   */
  async create(data: Partial<Profile>): Promise<Profile> {
    const profile = this.em.create(Profile, data as any);
    await this.em.persistAndFlush(profile);
    return profile;
  }

  /**
   * Update existing profile
   */
  async update(id: string, data: Partial<Profile>): Promise<Profile> {
    const profile = await this.em.findOne(Profile, { id });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    this.em.assign(profile, data);
    await this.em.flush();

    return profile;
  }

  /**
   * Delete profile
   */
  async delete(id: string): Promise<void> {
    const profile = await this.em.findOne(Profile, { id });

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    await this.em.removeAndFlush(profile);
  }
}
