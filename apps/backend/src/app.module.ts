import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './db/database.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { EventsModule } from './events/events.module';
import { MembershipsModule } from './memberships/memberships.module';
import { EventRegistrationsModule } from './event-registrations/event-registrations.module';
import { RulebooksModule } from './rulebooks/rulebooks.module';
import { CompetitionResultsModule } from './competition-results/competition-results.module';
import { MembershipTypesModule } from './membership-types/membership-types.module';
import { PermissionsModule } from './permissions/permissions.module';
import { BannersModule } from './banners/banners.module';
import { DirectoriesModule } from './directories/directories.module';
import { TeamsModule } from './teams/teams.module';

/**
 * Root Application Module
 *
 * Imports:
 * - DatabaseModule (Global) - Provides MikroORM & EntityManager to all modules
 * - AuthModule (Global) - Provides authentication & authorization guards
 * - Feature Modules - All converted to NestJS
 *
 * Migration Progress:
 * - ✅ DatabaseModule
 * - ✅ AuthModule - Extensible permission system
 * - ✅ ProfilesModule
 * - ✅ EventsModule
 * - ✅ MembershipsModule
 * - ✅ EventRegistrationsModule
 * - ✅ RulebooksModule
 * - ✅ CompetitionResultsModule
 * - ✅ MembershipTypesModule (NEW!)
 * - ✅ PermissionsModule (NEW!)
 * - ✅ BannersModule (NEW!)
 * - ✅ DirectoriesModule (NEW!)
 * - ✅ TeamsModule (NEW!)
 *
 * 🎉 Phase 1 Complete! All base modules converted!
 * 🔐 Phase 2 Complete! Auth & Permission system!
 * 💎 Phase 3 Complete! Extensible Membership System!
 */
@Module({
  imports: [
    DatabaseModule, // @Global() - provides MikroORM & EntityManager
    AuthModule, // @Global() - provides AuthGuard & PermissionGuard
    ProfilesModule,
    EventsModule,
    MembershipsModule,
    EventRegistrationsModule,
    RulebooksModule,
    CompetitionResultsModule,
    MembershipTypesModule, // NEW - Manage membership types
    PermissionsModule, // NEW - Permission management
    BannersModule, // NEW - Banner & ad management
    DirectoriesModule, // NEW - Directory listings
    TeamsModule, // NEW - Team management with ownership
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
