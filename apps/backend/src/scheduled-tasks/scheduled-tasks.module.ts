import { Module, forwardRef } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { ScheduledTasksController } from './scheduled-tasks.controller';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { RecurringInvoicesModule } from '../recurring-invoices/recurring-invoices.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { UserActivityModule } from '../user-activity/user-activity.module';
import { StripeModule } from '../stripe/stripe.module';
import { AdminNotificationsModule } from '../admin-notifications/admin-notifications.module';

@Module({
  imports: [
    EmailModule,
    AuthModule,
    InvoicesModule,
    RecurringInvoicesModule,
    MembershipsModule,
    SiteSettingsModule,
    UserActivityModule,
    forwardRef(() => StripeModule),
    AdminNotificationsModule,
  ],
  providers: [ScheduledTasksService],
  controllers: [ScheduledTasksController],
  exports: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
