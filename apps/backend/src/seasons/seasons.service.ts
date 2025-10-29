import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { Season } from './season.entity';
import { ENTITY_MANAGER } from '../db/database.module';

@Injectable()
export class SeasonsService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  /**
   * Find all seasons ordered by year (descending)
   */
  async findAll(): Promise<Season[]> {
    return this.em.find(Season, {}, {
      orderBy: { year: 'DESC' },
    });
  }

  /**
   * Find season by ID
   */
  async findById(id: string): Promise<Season | null> {
    return this.em.findOne(Season, { id });
  }

  /**
   * Find current season
   */
  async findCurrent(): Promise<Season | null> {
    return this.em.findOne(Season, { isCurrent: true });
  }

  /**
   * Find next season
   */
  async findNext(): Promise<Season | null> {
    return this.em.findOne(Season, { isNext: true });
  }

  /**
   * Create new season
   */
  async create(data: Partial<Season>): Promise<Season> {
    const season = this.em.create(Season, data);
    await this.em.persistAndFlush(season);
    return season;
  }

  /**
   * Update season
   */
  async update(id: string, data: Partial<Season>): Promise<Season> {
    const season = await this.em.findOne(Season, { id });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    this.em.assign(season, data);
    await this.em.flush();
    return season;
  }

  /**
   * Delete season
   */
  async delete(id: string): Promise<void> {
    const season = await this.em.findOne(Season, { id });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    await this.em.removeAndFlush(season);
  }
}
