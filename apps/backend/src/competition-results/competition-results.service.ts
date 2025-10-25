import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { CompetitionResult } from './competition-results.entity';
import { ENTITY_MANAGER } from '../db/database.module';

@Injectable()
export class CompetitionResultsService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  async findById(id: string): Promise<CompetitionResult | null> {
    return this.em.findOne(CompetitionResult, { id }, {
      populate: ['event', 'competitor', 'createdBy'],
    });
  }

  async findByEvent(eventId: string): Promise<CompetitionResult[]> {
    return this.em.find(CompetitionResult, {
      event: eventId,
    }, {
      orderBy: { placement: 'ASC' },
      populate: ['competitor', 'createdBy'],
    });
  }

  async findByCompetitor(competitorId: string): Promise<CompetitionResult[]> {
    return this.em.find(CompetitionResult, {
      competitor: competitorId,
    }, {
      orderBy: { createdAt: 'DESC' },
      populate: ['event', 'createdBy'],
    });
  }

  async findByCategory(eventId: string, category: string): Promise<CompetitionResult[]> {
    return this.em.find(CompetitionResult, {
      event: eventId,
      category,
    }, {
      orderBy: { placement: 'ASC' },
      populate: ['competitor', 'createdBy'],
    });
  }

  async getLeaderboard(eventId: string): Promise<CompetitionResult[]> {
    return this.em.find(CompetitionResult, {
      event: eventId,
    }, {
      orderBy: { placement: 'ASC', scoreOverall: 'DESC' },
      populate: ['competitor'],
    });
  }

  async create(data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const result = this.em.create(CompetitionResult, data as any);
    await this.em.persistAndFlush(result);
    return result;
  }

  async update(id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const result = await this.em.findOne(CompetitionResult, { id });

    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }

    this.em.assign(result, data);
    await this.em.flush();

    return result;
  }

  async delete(id: string): Promise<void> {
    const result = await this.em.findOne(CompetitionResult, { id });

    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }

    await this.em.removeAndFlush(result);
  }
}
