import { Module } from '@nestjs/common';
import { AdvertisersService } from './advertisers.service';
import { AdvertisersController } from './advertisers.controller';
import { BannersService } from './banners.service';
import { BannerReportService } from './banner-report.service';
import { BannersController } from './banners.controller';

@Module({
  controllers: [AdvertisersController, BannersController],
  providers: [AdvertisersService, BannersService, BannerReportService],
  exports: [AdvertisersService, BannersService, BannerReportService],
})
export class BannersModule {}
