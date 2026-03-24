import { Module } from '@nestjs/common';
import { ForeverMembersController } from './forever-members.controller';
import { ForeverMembersService } from './forever-members.service';

@Module({
  controllers: [ForeverMembersController],
  providers: [ForeverMembersService],
  exports: [ForeverMembersService],
})
export class ForeverMembersModule {}
