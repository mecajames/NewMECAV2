import { Module } from '@nestjs/common';
import { ConstantContactController } from './constant-contact.controller';
import { ConstantContactService } from './constant-contact.service';

@Module({
  controllers: [ConstantContactController],
  providers: [ConstantContactService],
  exports: [ConstantContactService],
})
export class ConstantContactModule {}
