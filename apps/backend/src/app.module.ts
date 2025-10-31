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
import { DatabaseModule } from './db/database.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
