import { Module } from '@nestjs/common';
import { EventRegistrationsController } from './event-registrations.controller';
import { EventRegistrationsService } from './event-registrations.service';
import { QrCodeService } from './qr-code.service';

@Module({
  controllers: [EventRegistrationsController],
  providers: [EventRegistrationsService, QrCodeService],
  exports: [EventRegistrationsService, QrCodeService],
})
export class EventRegistrationsModule {}
