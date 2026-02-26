import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';
import { PrerenderService } from './prerender.service';

@Module({
  controllers: [SeoController],
  providers: [SeoService, PrerenderService],
  exports: [SeoService, PrerenderService],
})
export class SeoModule {}
