import { Module } from '@nestjs/common';
import { ChampionshipArchivesController } from './championship-archives.controller';
import { ChampionshipArchivesService } from './championship-archives.service';

@Module({
  controllers: [ChampionshipArchivesController],
  providers: [ChampionshipArchivesService],
  exports: [ChampionshipArchivesService],
})
export class ChampionshipArchivesModule {}
