import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminNotificationsController } from './admin-notifications.controller';

@Module({
  imports: [EmailModule, NotificationsModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
  exports: [AdminNotificationsService],
})
export class AdminNotificationsModule {}
