import { Module } from '@nestjs/common';
import { EventHostingRequestsController } from './event-hosting-requests.controller';
import { EventHostingRequestsService } from './event-hosting-requests.service';

@Module({
  controllers: [EventHostingRequestsController],
  providers: [EventHostingRequestsService],
  exports: [EventHostingRequestsService],
})
export class EventHostingRequestsModule {}
