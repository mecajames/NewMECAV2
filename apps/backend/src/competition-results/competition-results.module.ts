import { Module } from '@nestjs/common';
import { CompetitionResultsController } from './competition-results.controller';
import { CompetitionResultsService } from './competition-results.service';
import { ResultsImportService } from './results-import.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CompetitionResultsController],
  providers: [CompetitionResultsService, ResultsImportService],
  exports: [CompetitionResultsService],
})
export class CompetitionResultsModule {}
