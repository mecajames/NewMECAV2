import { Module } from '@nestjs/common';
import { EventRegistrationsController } from './event-registrations.controller';
import { EventRegistrationsService } from './event-registrations.service';
import { QrCodeService } from './qr-code.service';
import { ScoreSheetService } from './score-sheets/score-sheet.service';

@Module({
  controllers: [EventRegistrationsController],
  providers: [EventRegistrationsService, QrCodeService, ScoreSheetService],
  exports: [EventRegistrationsService, QrCodeService],
})
export class EventRegistrationsModule {}
