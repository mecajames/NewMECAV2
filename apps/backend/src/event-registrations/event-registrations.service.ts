import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { EventRegistration } from './event-registrations.entity';
import { ENTITY_MANAGER } from '../db/database.module';

@Injectable()
export class EventRegistrationsService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<EventRegistration[]> {
    const offset = (page - 1) * limit;
    return this.em.find(EventRegistration, {}, {
      limit,
      offset,
      orderBy: { registeredAt: 'DESC' },
      populate: ['event', 'user'],
    });
  }

  async findById(id: string): Promise<EventRegistration | null> {
    return this.em.findOne(EventRegistration, { id }, {
      populate: ['event', 'user'],
    });
  }

  async findByEvent(eventId: string): Promise<EventRegistration[]> {
    return this.em.find(EventRegistration, {
      event: eventId,
    }, {
      orderBy: { registeredAt: 'ASC' },
      populate: ['user'],
    });
  }

  async findByUser(userId: string): Promise<EventRegistration[]> {
    return this.em.find(EventRegistration, {
      user: userId,
    }, {
      orderBy: { registeredAt: 'DESC' },
      populate: ['event'],
    });
  }

  async create(data: Partial<EventRegistration>): Promise<EventRegistration> {
    const registration = this.em.create(EventRegistration, data as any);
    await this.em.persistAndFlush(registration);
    return registration;
  }

  async update(id: string, data: Partial<EventRegistration>): Promise<EventRegistration> {
    const registration = await this.em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Event registration with ID ${id} not found`);
    }

    this.em.assign(registration, data);
    await this.em.flush();

    return registration;
  }

  async delete(id: string): Promise<void> {
    const registration = await this.em.findOne(EventRegistration, { id });

    if (!registration) {
      throw new NotFoundException(`Event registration with ID ${id} not found`);
    }

    await this.em.removeAndFlush(registration);
  }

  async countByEvent(eventId: string): Promise<number> {
    return this.em.count(EventRegistration, { event: eventId });
  }
}
