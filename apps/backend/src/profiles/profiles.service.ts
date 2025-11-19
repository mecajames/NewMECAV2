import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Profile } from './profiles.entity';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<Profile[]> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;
    return em.find(Profile, {}, {
      limit,
      offset
    });
  }

  async findById(id: string): Promise<Profile> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    return profile;
  }

  async findByEmail(email: string): Promise<Profile | null> {
    const em = this.em.fork();
    return em.findOne(Profile, { email });
  }

  /**
   * Generates the next MECA ID. New users start from 700800.
   * Existing users from old system may have different ID ranges.
   */
  async generateNextMecaId(): Promise<string> {
    const em = this.em.fork();

    // Get all profiles with MECA IDs
    const profiles = await em.find(Profile, {
      meca_id: { $ne: null }
    }, {
      fields: ['meca_id']
    });

    // Extract numeric MECA IDs
    const numericIds = profiles
      .map(p => parseInt(p.meca_id || '0', 10))
      .filter(id => !isNaN(id) && id >= 700800); // Only consider IDs in the new range

    // Find the highest ID in the new range
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 700799;

    // Return next ID
    return String(maxId + 1);
  }

  async create(data: Partial<Profile>): Promise<Profile> {
    // Auto-generate MECA ID if not provided
    if (!data.meca_id) {
      data.meca_id = await this.generateNextMecaId();
    }

    const em = this.em.fork();
    const profile = em.create(Profile, data as any);
    await em.persistAndFlush(profile);
    return profile;
  }

  async update(id: string, data: Partial<Profile>): Promise<Profile> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    em.assign(profile, data);
    await em.flush();
    return profile;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    await em.removeAndFlush(profile);
  }

  async getStats(): Promise<{ totalUsers: number; totalMembers: number }> {
    const em = this.em.fork();

    // Total users count
    const totalUsers = await em.count(Profile, {});

    // Total active members (membership_status = 'active')
    const totalMembers = await em.count(Profile, { membership_status: 'active' });

    return { totalUsers, totalMembers };
  }
}
