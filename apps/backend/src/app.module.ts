import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './db/database.module';
import { ProfilesModule } from './profiles/profiles.module';
import { EventsModule } from './events/events.module';
import { MembershipsModule } from './memberships/memberships.module';
import { EventRegistrationsModule } from './event-registrations/event-registrations.module';
import { RulebooksModule } from './rulebooks/rulebooks.module';
import { CompetitionResultsModule } from './competition-results/competition-results.module';

/**
 * Root Application Module
 *
 * Imports:
 * - DatabaseModule (Global) - Provides MikroORM & EntityManager to all modules
 * - Feature Modules - Will be added as they're converted
 *
 * Migration Progress:
 * - ✅ DatabaseModule
 * - ✅ ProfilesModule (DONE!)
 * - ✅ EventsModule (DONE!)
 * - ✅ MembershipsModule (DONE!)
 * - ✅ EventRegistrationsModule (DONE!)
 * - ✅ RulebooksModule (DONE!)
 * - ✅ CompetitionResultsModule (DONE!)
 *
 * 🎉 Phase 1 Complete! All 6 backend modules converted to NestJS!
 */
@Module({
  imports: [
    DatabaseModule, // @Global() - provides MikroORM & EntityManager
    ProfilesModule, // ✅ Profiles routes: /api/profiles/*
    EventsModule,   // ✅ Events routes: /api/events/*
    MembershipsModule, // ✅ Memberships routes: /api/memberships/*
    EventRegistrationsModule, // ✅ Event Registrations routes: /api/event-registrations/*
    RulebooksModule, // ✅ Rulebooks routes: /api/rulebooks/*
    CompetitionResultsModule, // ✅ Competition Results routes: /api/competition-results/*
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
