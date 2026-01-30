import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { MemberStatsService } from './member-stats.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, MemberStatsService],
  exports: [ProfilesService, MemberStatsService],
})
export class ProfilesModule {}
