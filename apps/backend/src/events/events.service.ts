import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { Event } from './events.entity';
import { ENTITY_MANAGER } from '../db/database.module';
import { EventStatus } from '../types/enums';

/**
 * EventsService
 *
 * Business logic for event operations.
 * Uses MikroORM EntityManager for database operations.
 */
@Injectable()
export class EventsService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  /**
   * Find all events with pagination
   */
  async findAll(page: number = 1, limit: number = 10): Promise<Event[]> {
    const offset = (page - 1) * limit;
    return this.em.find(Event, {}, {
      limit,
      offset,
      orderBy: { eventDate: 'DESC' },
      populate: ['eventDirector'],
    });
  }

  /**
   * Find event by ID
   */
  async findById(id: string): Promise<Event | null> {
    return this.em.findOne(Event, { id }, {
      populate: ['eventDirector'],
    });
  }

  /**
   * Find upcoming events
   */
  async findUpcoming(): Promise<Event[]> {
    return this.em.find(Event, {
      status: EventStatus.UPCOMING,
      eventDate: { $gte: new Date() },
    }, {
      orderBy: { eventDate: 'ASC' },
      populate: ['eventDirector'],
    });
  }

  /**
   * Find events by status
   */
  async findByStatus(status: EventStatus): Promise<Event[]> {
    return this.em.find(Event, { status }, {
      orderBy: { eventDate: 'DESC' },
      populate: ['eventDirector'],
    });
  }

  /**
   * Find events by director
   */
  async findByDirector(directorId: string): Promise<Event[]> {
    return this.em.find(Event, {
      eventDirector: directorId,
    }, {
      orderBy: { eventDate: 'DESC' },
    });
  }

  /**
   * Create new event
   */
  async create(data: Partial<Event>): Promise<Event> {
    const event = this.em.create(Event, data as any);
    await this.em.persistAndFlush(event);
    return event;
  }

  /**
   * Update existing event
   */
  async update(id: string, data: Partial<Event>): Promise<Event> {
    const event = await this.em.findOne(Event, { id });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    this.em.assign(event, data);
    await this.em.flush();

    return event;
  }

  /**
   * Delete event
   */
  async delete(id: string): Promise<void> {
    const event = await this.em.findOne(Event, { id });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    await this.em.removeAndFlush(event);
  }
}
