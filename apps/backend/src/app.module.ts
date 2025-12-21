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
import { ChampionshipArchivesModule } from './championship-archives/championship-archives.module';
import { ClassNameMappingsModule } from './class-name-mappings/class-name-mappings.module';
import { MembershipTypeConfigsModule } from './membership-type-configs/membership-type-configs.module';
import { RecaptchaModule } from './recaptcha/recaptcha.module';
import { PaymentsModule } from './payments/payments.module';
import { StripeModule } from './stripe/stripe.module';
import { QuickBooksModule } from './quickbooks/quickbooks.module';
import { TeamsModule } from './teams/teams.module';
import { TicketsModule } from './tickets/tickets.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { BusinessListingsModule } from './business-listings/business-listings.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    EmailModule,
    ProfilesModule,
    EventsModule,
    MembershipsModule,
    MembershipTypeConfigsModule,
    PaymentsModule,
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
    ChampionshipArchivesModule,
    ClassNameMappingsModule,
    RecaptchaModule,
    StripeModule,
    QuickBooksModule,
    TeamsModule,
    TicketsModule,
    BusinessListingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
