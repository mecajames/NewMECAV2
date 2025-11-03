import { Module } from '@nestjs/common';
import { CompetitionFormatsController } from './competition-formats.controller';
import { CompetitionFormatsService } from './competition-formats.service';

@Module({
  controllers: [CompetitionFormatsController],
  providers: [CompetitionFormatsService],
  exports: [CompetitionFormatsService],
})
export class CompetitionFormatsModule {}
