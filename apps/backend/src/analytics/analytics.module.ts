import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SearchConsoleService } from './search-console.service';
import { AnalyticsEmailService } from './analytics-email.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, SearchConsoleService, AnalyticsEmailService],
  exports: [AnalyticsService, SearchConsoleService],
})
export class AnalyticsModule {}
