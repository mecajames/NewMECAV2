import { Module } from '@nestjs/common';
import { CompetitionClassesController } from './competition-classes.controller';
import { CompetitionClassesService } from './competition-classes.service';

// Competition Classes Module
@Module({
  controllers: [CompetitionClassesController],
  providers: [CompetitionClassesService],
  exports: [CompetitionClassesService],
})
export class CompetitionClassesModule {}
