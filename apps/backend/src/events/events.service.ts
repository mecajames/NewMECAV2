import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Event } from './events.entity';
import { EventStatus } from '../types/enums';

@Injectable()
export class EventsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<Event[]> {
    const offset = (page - 1) * limit;
    return this.em.find(Event, {}, { 
      limit, 
      offset,
      orderBy: { eventDate: 'ASC' }
    });
  }

  async findById(id: string): Promise<Event> {
    const event = await this.em.findOne(Event, { id });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async findUpcoming(): Promise<Event[]> {
    return this.em.find(Event, {
      eventDate: { $gte: new Date() },
      status: EventStatus.UPCOMING
    }, {
      orderBy: { eventDate: 'ASC' }
    });
  }

  async findByStatus(status: string): Promise<Event[]> {
    return this.em.find(Event, { status: status as any });
  }

  async findByDirector(directorId: string): Promise<Event[]> {
    return this.em.find(Event, { eventDirector: directorId });
  }

  async create(data: Partial<Event>): Promise<Event> {
    const event = this.em.create(Event, data as any);
    await this.em.persistAndFlush(event);
    return event;
  }

  async update(id: string, data: Partial<Event>): Promise<Event> {
    const event = await this.findById(id);
    this.em.assign(event, data);
    await this.em.flush();
    return event;
  }

  async delete(id: string): Promise<void> {
    const event = await this.findById(id);
    await this.em.removeAndFlush(event);
  }
}
