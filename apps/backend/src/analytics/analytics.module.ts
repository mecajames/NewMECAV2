import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SearchConsoleService } from './search-console.service';
import { AnalyticsEmailService } from './analytics-email.service';
import { AnalyticsController } from './analytics.controller';
import { MemberAnalyticsService } from './member-analytics.service';
import { MemberAnalyticsController } from './member-analytics.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController, MemberAnalyticsController],
  providers: [AnalyticsService, SearchConsoleService, AnalyticsEmailService, MemberAnalyticsService],
  exports: [AnalyticsService, SearchConsoleService, MemberAnalyticsService],
})
export class AnalyticsModule {}
