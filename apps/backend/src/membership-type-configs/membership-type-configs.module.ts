import { Module } from '@nestjs/common';
import { MembershipTypeConfigsService } from './membership-type-configs.service';
import { MembershipTypeConfigsController } from './membership-type-configs.controller';

@Module({
  imports: [],
  controllers: [MembershipTypeConfigsController],
  providers: [MembershipTypeConfigsService],
  exports: [MembershipTypeConfigsService],
})
export class MembershipTypeConfigsModule {}
