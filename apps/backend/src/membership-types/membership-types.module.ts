import { Module } from '@nestjs/common';
import { MembershipTypesController } from './membership-types.controller';
import { MembershipTypesService } from './membership-types.service';

@Module({
  controllers: [MembershipTypesController],
  providers: [MembershipTypesService],
  exports: [MembershipTypesService],
})
export class MembershipTypesModule {}
