import { Injectable, Inject } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { ENTITY_MANAGER } from './db/database.module';
import { Profile } from './profiles/profiles.entity';
import { Event } from './events/events.entity';
import { EventRegistration } from './event-registrations/event-registrations.entity';

/**
 * Root Application Service
 * Provides business logic for health check and dashboard statistics
 */
@Injectable()
export class AppService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      architecture: 'NestJS',
      database: 'PostgreSQL (MikroORM)',
    };
  }

  /**
   * Get dashboard statistics
   * Used by AdminDashboard to show counts
   */
  async getStatistics() {
    const [totalUsers, totalEvents, totalRegistrations, totalMembers] = await Promise.all([
      this.em.count(Profile),
      this.em.count(Event),
      this.em.count(EventRegistration),
      this.em.count(Profile, { membershipStatus: 'active' }),
    ]);

    return {
      totalUsers,
      totalEvents,
      totalRegistrations,
      totalMembers,
    };
  }
}
