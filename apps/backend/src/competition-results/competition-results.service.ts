import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { CompetitionResult } from './competition-results.entity';

@Injectable()
export class CompetitionResultsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<CompetitionResult[]> {
    return this.em.find(CompetitionResult, {});
  }

  async findById(id: string): Promise<CompetitionResult> {
    const result = await this.em.findOne(CompetitionResult, { id });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }
    return result;
  }

  async findByEvent(eventId: string): Promise<CompetitionResult[]> {
    return this.em.find(CompetitionResult, { event: eventId }, {
      orderBy: { placement: 'ASC' }
    });
  }

  async findByCompetitor(competitorId: string): Promise<CompetitionResult[]> {
    return this.em.find(CompetitionResult, { competitor: competitorId });
  }

  async create(data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const result = this.em.create(CompetitionResult, data as any);
    await this.em.persistAndFlush(result);
    return result;
  }

  async update(id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const result = await this.findById(id);
    this.em.assign(result, data);
    await this.em.flush();
    return result;
  }

  async delete(id: string): Promise<void> {
    const result = await this.findById(id);
    await this.em.removeAndFlush(result);
  }
}
