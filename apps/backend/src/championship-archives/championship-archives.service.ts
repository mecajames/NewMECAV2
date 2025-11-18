import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ChampionshipArchive } from './championship-archives.entity';
import { ChampionshipAward, AwardSection } from './championship-awards.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Event } from '../events/events.entity';
import { Season } from '../seasons/seasons.entity';
import { EventType } from '../types/enums';

@Injectable()
export class ChampionshipArchivesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Get all championship archives (for index page)
   */
  async findAll(): Promise<ChampionshipArchive[]> {
    const em = this.em.fork();
    return em.find(ChampionshipArchive, {}, {
      populate: ['season'],
      orderBy: { year: 'DESC' },
    });
  }

  /**
   * Get all published archives (public)
   */
  async findAllPublished(): Promise<ChampionshipArchive[]> {
    const em = this.em.fork();
    return em.find(
      ChampionshipArchive,
      { published: true },
      {
        populate: ['season'],
        orderBy: { year: 'DESC' },
      }
    );
  }

  /**
   * Get archive by year
   */
  async findByYear(year: number, includeUnpublished = false): Promise<ChampionshipArchive> {
    const em = this.em.fork();
    const where: any = { year };
    if (!includeUnpublished) {
      where.published = true;
    }

    const archive = await em.findOne(ChampionshipArchive, where, {
      populate: ['season', 'worldFinalsEvent'],
    });

    if (!archive) {
      throw new NotFoundException(`Championship archive for year ${year} not found`);
    }

    return archive;
  }

  /**
   * Get archive by ID
   */
  async findById(id: string): Promise<ChampionshipArchive> {
    const em = this.em.fork();
    const archive = await em.findOne(ChampionshipArchive, { id }, {
      populate: ['season', 'worldFinalsEvent'],
    });

    if (!archive) {
      throw new NotFoundException(`Championship archive with ID ${id} not found`);
    }

    return archive;
  }

  /**
   * Create a new archive
   */
  async create(data: Partial<ChampionshipArchive>): Promise<ChampionshipArchive> {
    const em = this.em.fork();
    const archive = em.create(ChampionshipArchive, data as any);
    await em.persistAndFlush(archive);
    return archive;
  }

  /**
   * Auto-create archive for a season
   */
  async createArchiveForSeason(seasonId: string, year: number): Promise<ChampionshipArchive> {
    const em = this.em.fork();
    const season = await em.findOne(Season, { id: seasonId });
    if (!season) {
      throw new NotFoundException(`Season with ID ${seasonId} not found`);
    }

    const archive = em.create(ChampionshipArchive, {
      season,
      year,
      title: `${year} MECA World Champions`,
      published: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await em.persistAndFlush(archive);
    return archive;
  }

  /**
   * Update an archive
   */
  async update(id: string, data: Partial<ChampionshipArchive>): Promise<ChampionshipArchive> {
    const em = this.em.fork();
    const archive = await em.findOne(ChampionshipArchive, { id });
    if (!archive) {
      throw new NotFoundException(`Championship archive with ID ${id} not found`);
    }

    em.assign(archive, data);
    await em.flush();
    return archive;
  }

  /**
   * Set published status
   */
  async setPublished(id: string, published: boolean): Promise<ChampionshipArchive> {
    const em = this.em.fork();
    const archive = await em.findOne(ChampionshipArchive, { id });
    if (!archive) {
      throw new NotFoundException(`Championship archive with ID ${id} not found`);
    }

    archive.published = published;
    await em.flush();
    return archive;
  }

  /**
   * Delete an archive
   */
  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const archive = await em.findOne(ChampionshipArchive, { id });
    if (!archive) {
      throw new NotFoundException(`Championship archive with ID ${id} not found`);
    }
    await em.removeAndFlush(archive);
  }

  /**
   * Get competition results for a year's archive
   * Grouped by format and class
   */
  async getResultsForYear(year: number): Promise<any> {
    const em = this.em.fork();

    // Find the archive for this year
    const archive = await em.findOne(ChampionshipArchive, { year }, {
      populate: ['worldFinalsEvent'],
    });

    if (!archive || !archive.worldFinalsEvent) {
      return {};
    }

    // Get all results for the world finals event
    const results = await em.find(CompetitionResult, {
      event: archive.worldFinalsEvent,
    }, {
      populate: ['competitor', 'event', 'competitionClass'],
      orderBy: { placement: 'ASC' },
    });

    // Group results by format and then by class
    const grouped: any = {};

    for (const result of results) {
      const format = (result as any).format || 'Unknown';
      const competitionClass = (result as any).competitionClass;
      const className = competitionClass?.className || 'Unknown';

      if (!grouped[format]) {
        grouped[format] = {};
      }

      if (!grouped[format][className]) {
        grouped[format][className] = [];
      }

      grouped[format][className].push({
        placement: result.placement,
        competitorName: (result.competitor as any)?.firstName + ' ' + (result.competitor as any)?.lastName,
        teamName: (result as any).teamName || null,
        state: (result as any).state || null,
        score: (result as any).score,
      });
    }

    return grouped;
  }

  /**
   * Get state champions for a year
   * Calculated from state finals events
   */
  async getStateChampionsForYear(year: number): Promise<any> {
    const em = this.em.fork();

    // Find the season for this year
    const season = await em.findOne(Season, { year });
    if (!season) {
      return {};
    }

    // Find all state finals events for this season
    const stateFinalsEvents = await em.find(Event, {
      season,
      eventType: EventType.STATE_FINALS,
    });

    if (stateFinalsEvents.length === 0) {
      return {};
    }

    // Get all 1st place results from state finals events
    const stateChampions: any = {};

    for (const event of stateFinalsEvents) {
      const firstPlaceResults = await em.find(CompetitionResult, {
        event,
        placement: 1,
      }, {
        populate: ['competitor', 'competitionClass'],
      });

      const state = (event as any).venueState || 'Unknown';
      if (!stateChampions[state]) {
        stateChampions[state] = [];
      }

      for (const result of firstPlaceResults) {
        const competitionClass = (result as any).competitionClass;
        const className = competitionClass?.className || 'Unknown';

        stateChampions[state].push({
          className,
          competitorName: (result.competitor as any)?.firstName + ' ' + (result.competitor as any)?.lastName,
          teamName: (result as any).teamName || null,
          score: (result as any).score,
        });
      }
    }

    return stateChampions;
  }

  // ===== AWARDS =====

  /**
   * Get all awards for an archive
   */
  async getAwards(archiveId: string, section?: AwardSection): Promise<ChampionshipAward[]> {
    const em = this.em.fork();
    const where: any = { archive: { id: archiveId } };
    if (section) {
      where.section = section;
    }

    return em.find(ChampionshipAward, where, {
      orderBy: { displayOrder: 'ASC' },
    });
  }

  /**
   * Create an award
   */
  async createAward(archiveId: string, data: Partial<ChampionshipAward>): Promise<ChampionshipAward> {
    const em = this.em.fork();
    const archive = await em.findOne(ChampionshipArchive, { id: archiveId });
    if (!archive) {
      throw new NotFoundException(`Championship archive with ID ${archiveId} not found`);
    }

    const award = em.create(ChampionshipAward, {
      ...data,
      archive,
    } as any);

    await em.persistAndFlush(award);
    return award;
  }

  /**
   * Update an award
   */
  async updateAward(archiveId: string, awardId: string, data: Partial<ChampionshipAward>): Promise<ChampionshipAward> {
    const em = this.em.fork();
    const award = await em.findOne(ChampionshipAward, {
      id: awardId,
      archive: { id: archiveId },
    });

    if (!award) {
      throw new NotFoundException(`Award with ID ${awardId} not found`);
    }

    em.assign(award, data);
    await em.flush();
    return award;
  }

  /**
   * Delete an award
   */
  async deleteAward(archiveId: string, awardId: string): Promise<void> {
    const em = this.em.fork();
    const award = await em.findOne(ChampionshipAward, {
      id: awardId,
      archive: { id: archiveId },
    });

    if (!award) {
      throw new NotFoundException(`Award with ID ${awardId} not found`);
    }

    await em.removeAndFlush(award);
  }
}
