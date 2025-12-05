import { Module, forwardRef } from '@nestjs/common';
import { EventHostingRequestsController } from './event-hosting-requests.controller';
import { EventHostingRequestsService } from './event-hosting-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    NotificationsModule,
    forwardRef(() => EventsModule),
  ],
  controllers: [EventHostingRequestsController],
  providers: [EventHostingRequestsService],
  exports: [EventHostingRequestsService],
})
export class EventHostingRequestsModule {}
