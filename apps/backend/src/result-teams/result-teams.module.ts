import { Module } from '@nestjs/common';
import { ResultTeamsService } from './result-teams.service';
import { ResultTeamsController } from './result-teams.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ResultTeamsController],
  providers: [ResultTeamsService],
  exports: [ResultTeamsService],
})
export class ResultTeamsModule {}
