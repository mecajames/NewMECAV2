import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { CompetitionClass } from './competition-classes.entity';

@Injectable()
export class CompetitionClassesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<CompetitionClass[]> {
    const em = this.em.fork();
    return em.find(CompetitionClass, {}, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<CompetitionClass> {
    const em = this.em.fork();
    const competitionClass = await em.findOne(CompetitionClass, { id });
    if (!competitionClass) {
      throw new NotFoundException(`Competition class with ID ${id} not found`);
    }
    return competitionClass;
  }

  async findBySeason(seasonId: string): Promise<CompetitionClass[]> {
    const em = this.em.fork();
    return em.find(CompetitionClass, { seasonId }, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async findByFormat(format: string): Promise<CompetitionClass[]> {
    const em = this.em.fork();
    return em.find(CompetitionClass, { format }, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async findActiveClasses(): Promise<CompetitionClass[]> {
    const em = this.em.fork();
    return em.find(CompetitionClass, { isActive: true }, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  async create(data: Partial<CompetitionClass>): Promise<CompetitionClass> {
    const em = this.em.fork();

    // Load the season reference
    const season = await em.findOne('Season', { id: (data as any).season_id });
    if (!season) {
      throw new NotFoundException(`Season with ID ${(data as any).season_id} not found`);
    }

    const competitionClass = em.create(CompetitionClass, {
      ...data,
      season, // Assign the loaded season entity
    } as any);
    await em.persistAndFlush(competitionClass);
    return competitionClass;
  }

  async update(id: string, data: Partial<CompetitionClass>): Promise<CompetitionClass> {
    const em = this.em.fork();
    const competitionClass = await em.findOne(CompetitionClass, { id });
    if (!competitionClass) {
      throw new NotFoundException(`Competition class with ID ${id} not found`);
    }

    em.assign(competitionClass, data);
    await em.flush();
    return competitionClass;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const competitionClass = await em.findOne(CompetitionClass, { id });
    if (!competitionClass) {
      throw new NotFoundException(`Competition class with ID ${id} not found`);
    }
    await em.removeAndFlush(competitionClass);
  }
}
