import { Module } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { ScheduledTasksController } from './scheduled-tasks.controller';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';

@Module({
  imports: [EmailModule, AuthModule, InvoicesModule, MembershipsModule, SiteSettingsModule],
  providers: [ScheduledTasksService],
  controllers: [ScheduledTasksController],
  exports: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
