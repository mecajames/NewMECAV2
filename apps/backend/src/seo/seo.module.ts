import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';
import { PrerenderService } from './prerender.service';
import { SlugBackfillService } from './slug-backfill.service';

@Module({
  controllers: [SeoController],
  providers: [SeoService, PrerenderService, SlugBackfillService],
  exports: [SeoService, PrerenderService],
})
export class SeoModule {}
