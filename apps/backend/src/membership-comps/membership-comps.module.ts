import { Module } from '@nestjs/common';
import { MembershipCompsService } from './membership-comps.service';
import { MembershipCompsController } from './membership-comps.controller';
import { UserActivityModule } from '../user-activity/user-activity.module';

@Module({
  imports: [UserActivityModule],
  controllers: [MembershipCompsController],
  providers: [MembershipCompsService],
  exports: [MembershipCompsService],
})
export class MembershipCompsModule {}
