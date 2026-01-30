import { Module } from '@nestjs/common';
import { AdvertisersService } from './advertisers.service';
import { AdvertisersController } from './advertisers.controller';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';

@Module({
  controllers: [AdvertisersController, BannersController],
  providers: [AdvertisersService, BannersService],
  exports: [AdvertisersService, BannersService],
})
export class BannersModule {}
