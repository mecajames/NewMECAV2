import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
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
import { OrdersModule } from './orders/orders.module';
import { InvoicesModule } from './invoices/invoices.module';
import { BillingModule } from './billing/billing.module';
import { JudgesModule } from './judges/judges.module';
import { EventDirectorsModule } from './event-directors/event-directors.module';
import { RatingsModule } from './ratings/ratings.module';
import { ContactModule } from './contact/contact.module';
import { WorldFinalsModule } from './world-finals/world-finals.module';
import { AchievementsModule } from './achievements/achievements.module';
import { ShopModule } from './shop/shop.module';
import { TrainingRecordsModule } from './training-records/training-records.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { BannersModule } from './banners/banners.module';
import { PointsConfigurationModule } from './points-configuration/points-configuration.module';
import { StatesModule } from './states/states.module';
import { ResultTeamsModule } from './result-teams/result-teams.module';
import { MemberGalleryModule } from './member-gallery/member-gallery.module';
import { StandingsModule } from './standings/standings.module';
import { ConstantContactModule } from './constant-contact/constant-contact.module';
import { ModerationModule } from './moderation/moderation.module';
import { UploadsModule } from './uploads/uploads.module';
import { FinalsVotingModule } from './finals-voting/finals-voting.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    // Scheduled tasks (cron jobs for membership expiration, event reminders, etc.)
    ScheduleModule.forRoot(),
    // Rate limiting: generous in development, stricter in production
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute window
        limit: process.env.NODE_ENV === 'development' ? 1000 : 1000,
      },
      {
        name: 'strict',
        ttl: 60000, // 1 minute window
        limit: process.env.NODE_ENV === 'development' ? 100 : 60,
      },
    ]),
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
    OrdersModule,
    InvoicesModule,
    BillingModule,
    JudgesModule,
    EventDirectorsModule,
    RatingsModule,
    ContactModule,
    WorldFinalsModule,
    AchievementsModule,
    ShopModule,
    TrainingRecordsModule,
    ScheduledTasksModule,
    BannersModule,
    PointsConfigurationModule,
    StatesModule,
    ResultTeamsModule,
    MemberGalleryModule,
    StandingsModule,
    ConstantContactModule,
    ModerationModule,
    UploadsModule,
    FinalsVotingModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally to all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
