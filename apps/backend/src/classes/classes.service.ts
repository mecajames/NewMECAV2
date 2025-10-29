import { Injectable, Inject } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { CompetitionClass } from './class.entity';
import { ENTITY_MANAGER } from '../db/database.module';

@Injectable()
export class ClassesService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager,
  ) {}

  /**
   * Get all classes, optionally filtered by season and/or format
   */
  async findAll(seasonId?: string, format?: string): Promise<CompetitionClass[]> {
    const where: any = {};

    if (seasonId) {
      // Use the relationship field name
      where.season = seasonId;
    }

    if (format) {
      where.format = format;
    }

    return this.em.find(CompetitionClass, where, {
      populate: ['season'],
      orderBy: { displayOrder: 'ASC' },
    });
  }

  /**
   * Get a single class by ID
   */
  async findOne(id: string): Promise<CompetitionClass | null> {
    return this.em.findOne(CompetitionClass, { id }, { populate: ['season'] });
  }

  /**
   * Create a new class
   */
  async create(data: Partial<CompetitionClass>): Promise<CompetitionClass> {
    const competitionClass = this.em.create(CompetitionClass, data);
    await this.em.persistAndFlush(competitionClass);
    return competitionClass;
  }

  /**
   * Update an existing class
   */
  async update(id: string, data: Partial<CompetitionClass>): Promise<CompetitionClass> {
    const competitionClass = await this.em.findOneOrFail(CompetitionClass, { id });
    this.em.assign(competitionClass, data);
    await this.em.flush();
    return competitionClass;
  }

  /**
   * Delete a class
   */
  async remove(id: string): Promise<void> {
    const competitionClass = await this.em.findOneOrFail(CompetitionClass, { id });
    await this.em.removeAndFlush(competitionClass);
  }

  /**
   * Copy classes from one season to another
   * Used when creating a new season
   */
  async copyClassesBetweenSeasons(
    sourceSeasonId: string,
    destSeasonId: string,
    format?: string,
  ): Promise<CompetitionClass[]> {
    const where: any = { season: sourceSeasonId };

    if (format) {
      where.format = format;
    }

    const sourceClasses = await this.em.find(CompetitionClass, where);
    const newClasses: CompetitionClass[] = [];

    for (const sourceClass of sourceClasses) {
      const newClass = this.em.create(CompetitionClass, {
        name: sourceClass.name,
        abbreviation: sourceClass.abbreviation,
        format: sourceClass.format,
        season: destSeasonId as any, // Season relationship
        isActive: sourceClass.isActive,
        displayOrder: sourceClass.displayOrder,
      });
      newClasses.push(newClass);
    }

    await this.em.persistAndFlush(newClasses);
    return newClasses;
  }
}
