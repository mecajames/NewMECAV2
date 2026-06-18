import { Module, forwardRef } from '@nestjs/common';
import { EventHostingRequestsController } from './event-hosting-requests.controller';
import { EventHostingRequestsService } from './event-hosting-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';
import { AdminNotificationsModule } from '../admin-notifications/admin-notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => EventsModule),
    AdminNotificationsModule,
    EmailModule,
  ],
  controllers: [EventHostingRequestsController],
  providers: [EventHostingRequestsService],
  exports: [EventHostingRequestsService],
})
export class EventHostingRequestsModule {}
