import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Season } from './seasons.entity';

@Injectable()
export class SeasonsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<Season[]> {
    const em = this.em.fork();
    return em.find(Season, {}, {
      orderBy: { year: 'DESC' },
    });
  }

  async findById(id: string): Promise<Season> {
    const em = this.em.fork();
    const season = await em.findOne(Season, { id });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }
    return season;
  }

  async create(data: Partial<Season>): Promise<Season> {
    const em = this.em.fork();

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = {};

    // Map snake_case to camelCase
    if ((data as any).start_date !== undefined) transformedData.startDate = (data as any).start_date;
    if ((data as any).end_date !== undefined) transformedData.endDate = (data as any).end_date;
    if ((data as any).is_current !== undefined) transformedData.isCurrent = (data as any).is_current;
    if ((data as any).is_next !== undefined) transformedData.isNext = (data as any).is_next;
    if ((data as any).qualification_points_threshold !== undefined) {
      transformedData.qualificationPointsThreshold = (data as any).qualification_points_threshold;
    }

    // Copy fields that don't need transformation
    if (data.year !== undefined) transformedData.year = data.year;
    if (data.name !== undefined) transformedData.name = data.name;
    if ((data as any).qualificationPointsThreshold !== undefined) {
      transformedData.qualificationPointsThreshold = (data as any).qualificationPointsThreshold;
    }

    // If this season is marked as current or next, unmark others
    if (transformedData.isCurrent) {
      await this.unmarkAllCurrent(em);
    }
    if (transformedData.isNext) {
      await this.unmarkAllNext(em);
    }

    const season = em.create(Season, transformedData);
    await em.persistAndFlush(season);
    return season;
  }

  async update(id: string, data: Partial<Season>): Promise<Season> {
    const em = this.em.fork();
    const season = await em.findOne(Season, { id });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = {};

    // Map snake_case to camelCase
    if ((data as any).start_date !== undefined) transformedData.startDate = (data as any).start_date;
    if ((data as any).end_date !== undefined) transformedData.endDate = (data as any).end_date;
    if ((data as any).is_current !== undefined) transformedData.isCurrent = (data as any).is_current;
    if ((data as any).is_next !== undefined) transformedData.isNext = (data as any).is_next;
    if ((data as any).qualification_points_threshold !== undefined) {
      transformedData.qualificationPointsThreshold = (data as any).qualification_points_threshold;
    }

    // Copy fields that don't need transformation
    if (data.year !== undefined) transformedData.year = data.year;
    if (data.name !== undefined) transformedData.name = data.name;
    if ((data as any).qualificationPointsThreshold !== undefined) {
      transformedData.qualificationPointsThreshold = (data as any).qualificationPointsThreshold;
    }

    // If updating to current or next, unmark others
    if (transformedData.isCurrent) {
      await this.unmarkAllCurrent(em);
    }
    if (transformedData.isNext) {
      await this.unmarkAllNext(em);
    }

    em.assign(season, transformedData);
    await em.flush();
    return season;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const season = await em.findOne(Season, { id });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }
    await em.removeAndFlush(season);
  }

  async setAsCurrent(id: string): Promise<Season> {
    const em = this.em.fork();
    const season = await em.findOne(Season, { id });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    // Unmark all other seasons as current
    await this.unmarkAllCurrent(em);

    season.isCurrent = true;
    season.isNext = false;
    await em.flush();
    return season;
  }

  async setAsNext(id: string): Promise<Season> {
    const em = this.em.fork();
    const season = await em.findOne(Season, { id });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }

    // Unmark all other seasons as next
    await this.unmarkAllNext(em);

    season.isNext = true;
    season.isCurrent = false;
    await em.flush();
    return season;
  }

  async getCurrentSeason(): Promise<Season | null> {
    const em = this.em.fork();
    return em.findOne(Season, { isCurrent: true });
  }

  async getNextSeason(): Promise<Season | null> {
    const em = this.em.fork();
    return em.findOne(Season, { isNext: true });
  }

  private async unmarkAllCurrent(em: EntityManager): Promise<void> {
    const currentSeasons = await em.find(Season, { isCurrent: true });
    currentSeasons.forEach(s => s.isCurrent = false);
  }

  private async unmarkAllNext(em: EntityManager): Promise<void> {
    const nextSeasons = await em.find(Season, { isNext: true });
    nextSeasons.forEach(s => s.isNext = false);
  }
}
