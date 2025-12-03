import { Module } from '@nestjs/common';
import { ClassNameMappingsController } from './class-name-mappings.controller';
import { ClassNameMappingsService } from './class-name-mappings.service';

@Module({
  controllers: [ClassNameMappingsController],
  providers: [ClassNameMappingsService],
  exports: [ClassNameMappingsService],
})
export class ClassNameMappingsModule {}
