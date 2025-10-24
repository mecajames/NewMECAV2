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
    const offset = (page - 1) * limit;
    return this.em.find(Profile, {}, { 
      limit, 
      offset 
    });
  }

  async findById(id: string): Promise<Profile> {
    const profile = await this.em.findOne(Profile, { id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }
    return profile;
  }

  async findByEmail(email: string): Promise<Profile | null> {
    return this.em.findOne(Profile, { email });
  }

  async create(data: Partial<Profile>): Promise<Profile> {
    const profile = this.em.create(Profile, data as any);
    await this.em.persistAndFlush(profile);
    return profile;
  }

  async update(id: string, data: Partial<Profile>): Promise<Profile> {
    const profile = await this.findById(id);
    this.em.assign(profile, data);
    await this.em.flush();
    return profile;
  }

  async delete(id: string): Promise<void> {
    const profile = await this.findById(id);
    await this.em.removeAndFlush(profile);
  }
}
