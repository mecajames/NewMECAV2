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
    const em = this.em.fork();
    return em.find(CompetitionResult, {});
  }

  async findById(id: string): Promise<CompetitionResult> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }
    return result;
  }

  async findByEvent(eventId: string): Promise<CompetitionResult[]> {
    const em = this.em.fork();
    return em.find(CompetitionResult, { eventId }, {
      orderBy: { placement: 'ASC' }
    });
  }

  async findByCompetitor(competitorId: string): Promise<CompetitionResult[]> {
    const em = this.em.fork();
    return em.find(CompetitionResult, { competitorId });
  }

  async create(data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const em = this.em.fork();
    const result = em.create(CompetitionResult, data as any);
    await em.persistAndFlush(result);
    return result;
  }

  async update(id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }
    em.assign(result, data);
    await em.flush();
    return result;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const result = await em.findOne(CompetitionResult, { id });
    if (!result) {
      throw new NotFoundException(`Competition result with ID ${id} not found`);
    }
    await em.removeAndFlush(result);
  }

  async getLeaderboard(seasonId?: string): Promise<any[]> {
    const em = this.em.fork();

    // Build the query filter
    const filter: any = {};
    if (seasonId) {
      filter.seasonId = seasonId;
    }

    // Fetch all results with the filter
    const results = await em.find(CompetitionResult, filter, {
      populate: ['competitor']
    });

    // Aggregate results by competitor
    const aggregated = new Map<string, any>();

    for (const result of results) {
      const competitorKey = result.competitor?.id || result.competitorName;

      if (!aggregated.has(competitorKey)) {
        aggregated.set(competitorKey, {
          competitor_id: result.competitor?.id || '',
          competitor_name: result.competitorName,
          total_points: 0,
          events_participated: 0,
          first_place: 0,
          second_place: 0,
          third_place: 0,
        });
      }

      const entry = aggregated.get(competitorKey);
      entry.total_points += result.pointsEarned || 0;
      entry.events_participated += 1;

      if (result.placement === 1) entry.first_place += 1;
      if (result.placement === 2) entry.second_place += 1;
      if (result.placement === 3) entry.third_place += 1;
    }

    // Convert to array and sort by total points descending
    return Array.from(aggregated.values())
      .sort((a, b) => b.total_points - a.total_points);
  }
}
