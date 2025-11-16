import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProfilesModule } from './profiles/profiles.module';
import { EventsModule } from './events/events.module';
import { MembershipsModule } from './memberships/memberships.module';
import { EventRegistrationsModule } from './event-registrations/event-registrations.module';
import { RulebooksModule } from './rulebooks/rulebooks.module';
import { CompetitionResultsModule } from './competition-results/competition-results.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MediaFilesModule } from './media-files/media-files.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { SeasonsModule } from './seasons/seasons.module';
import { CompetitionClassesModule } from './competition-classes/competition-classes.module';
import { CompetitionFormatsModule } from './competition-formats/competition-formats.module';
import { EventHostingRequestsModule } from './event-hosting-requests/event-hosting-requests.module';
import { DatabaseModule } from './db/database.module';
import { AuditModule } from './audit/audit.module';


@Module({
  imports: [
    DatabaseModule,
    ProfilesModule,
    EventsModule,
    MembershipsModule,
    EventRegistrationsModule,
    RulebooksModule,
    CompetitionResultsModule,
    NotificationsModule,
    MediaFilesModule,
    SiteSettingsModule,
    SeasonsModule,
    CompetitionClassesModule,
    CompetitionFormatsModule,
    EventHostingRequestsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
