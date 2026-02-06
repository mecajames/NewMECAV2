import { Module, forwardRef } from '@nestjs/common';
import { CompetitionResultsController } from './competition-results.controller';
import { CompetitionResultsService } from './competition-results.service';
import { ResultsImportService } from './results-import.service';
import { AuditModule } from '../audit/audit.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { WorldFinalsModule } from '../world-finals/world-finals.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { PointsConfigurationModule } from '../points-configuration/points-configuration.module';
import { ResultTeamsModule } from '../result-teams/result-teams.module';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => MembershipsModule),
    forwardRef(() => WorldFinalsModule),
    forwardRef(() => AchievementsModule),
    PointsConfigurationModule,
    ResultTeamsModule,
  ],
  controllers: [CompetitionResultsController],
  providers: [CompetitionResultsService, ResultsImportService],
  exports: [CompetitionResultsService],
})
export class CompetitionResultsModule {}
