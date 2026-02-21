import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { FinalsVotingController } from './finals-voting.controller';
import { FinalsVotingService } from './finals-voting.service';

@Module({
  imports: [AuthModule, MembershipsModule],
  controllers: [FinalsVotingController],
  providers: [FinalsVotingService],
  exports: [FinalsVotingService],
})
export class FinalsVotingModule {}
