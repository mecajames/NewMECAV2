import { Module } from '@nestjs/common';
import { RulebooksController } from './rulebooks.controller';
import { RulebooksService } from './rulebooks.service';

@Module({
  controllers: [RulebooksController],
  providers: [RulebooksService],
  exports: [RulebooksService],
})
export class RulebooksModule {}
