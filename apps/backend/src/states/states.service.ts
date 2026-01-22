import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { State } from './state.entity';
import { StateFinalsDate } from './state-finals-date.entity';

// DTOs
export interface CreateStateFinalsDateDto {
  eventId: string;
  stateCode: string;
  seasonId: string;
}

export interface UpdateStateFinalsDateDto {
  eventId?: string;
  stateCode?: string;
  seasonId?: string;
}

@Injectable()
export class StatesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ============================================
  // STATE METHODS
  // ============================================

  /**
   * Get all states
   */
  async getAllStates(): Promise<State[]> {
    const em = this.em.fork();
    return em.find(State, {}, {
      orderBy: { name: 'ASC' },
    });
  }

  /**
   * Get domestic (US) states only
   */
  async getDomesticStates(): Promise<State[]> {
    const em = this.em.fork();
    return em.find(State, { isInternational: false }, {
      orderBy: { name: 'ASC' },
    });
  }

  /**
   * Get international states/regions only
   */
  async getInternationalStates(): Promise<State[]> {
    const em = this.em.fork();
    return em.find(State, { isInternational: true }, {
      orderBy: { name: 'ASC' },
    });
  }

  /**
   * Get state by ID
   */
  async getStateById(id: string): Promise<State> {
    const em = this.em.fork();
    const state = await em.findOne(State, { id });
    if (!state) {
      throw new NotFoundException(`State with ID ${id} not found`);
    }
    return state;
  }

  /**
   * Get state by abbreviation
   */
  async getStateByAbbreviation(abbreviation: string): Promise<State> {
    const em = this.em.fork();
    const state = await em.findOne(State, {
      abbreviation: abbreviation.toUpperCase(),
    });
    if (!state) {
      throw new NotFoundException(`State with abbreviation ${abbreviation} not found`);
    }
    return state;
  }

  /**
   * Search states by name or abbreviation
   */
  async searchStates(query: string): Promise<State[]> {
    const em = this.em.fork();
    const searchTerm = query.toLowerCase().trim();

    return em.find(State, {
      $or: [
        { name: { $ilike: `%${searchTerm}%` } },
        { abbreviation: { $ilike: `%${searchTerm}%` } },
      ],
    }, {
      orderBy: { name: 'ASC' },
      limit: 20,
    });
  }

  // ============================================
  // STATE FINALS DATE METHODS
  // ============================================

  /**
   * Get all state finals dates for a season
   */
  async getStateFinalsDatesBySeasonId(seasonId: string): Promise<StateFinalsDate[]> {
    const em = this.em.fork();
    return em.find(StateFinalsDate, { season: seasonId }, {
      populate: ['event', 'season'],
      orderBy: { stateCode: 'ASC' },
    });
  }

  /**
   * Get state finals date for a specific state and season
   */
  async getStateFinalsDateByState(
    stateCode: string,
    seasonId: string,
  ): Promise<StateFinalsDate | null> {
    const em = this.em.fork();
    return em.findOne(StateFinalsDate, {
      stateCode: stateCode.toUpperCase(),
      season: seasonId,
    }, {
      populate: ['event', 'season'],
    });
  }

  /**
   * Create a state finals date (admin only)
   */
  async createStateFinalsDate(data: CreateStateFinalsDateDto): Promise<StateFinalsDate> {
    const em = this.em.fork();

    const stateFinalsDate = em.create(StateFinalsDate, {
      id: randomUUID(),
      event: data.eventId,
      stateCode: data.stateCode.toUpperCase(),
      season: data.seasonId,
    } as any);

    await em.persistAndFlush(stateFinalsDate);
    return stateFinalsDate;
  }

  /**
   * Update a state finals date (admin only)
   */
  async updateStateFinalsDate(
    id: string,
    data: UpdateStateFinalsDateDto,
  ): Promise<StateFinalsDate> {
    const em = this.em.fork();

    const stateFinalsDate = await em.findOne(StateFinalsDate, { id });
    if (!stateFinalsDate) {
      throw new NotFoundException(`State finals date with ID ${id} not found`);
    }

    em.assign(stateFinalsDate, {
      event: data.eventId !== undefined ? data.eventId : stateFinalsDate.event,
      stateCode: data.stateCode !== undefined ? data.stateCode.toUpperCase() : stateFinalsDate.stateCode,
      season: data.seasonId !== undefined ? data.seasonId : stateFinalsDate.season,
    });

    await em.flush();
    return stateFinalsDate;
  }

  /**
   * Delete a state finals date (admin only)
   */
  async deleteStateFinalsDate(id: string): Promise<void> {
    const em = this.em.fork();

    const stateFinalsDate = await em.findOne(StateFinalsDate, { id });
    if (!stateFinalsDate) {
      throw new NotFoundException(`State finals date with ID ${id} not found`);
    }

    await em.removeAndFlush(stateFinalsDate);
  }
}
