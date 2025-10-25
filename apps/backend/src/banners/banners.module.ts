import { Module } from '@nestjs/common';
import { BannersController, ManufacturerAdsController } from './banners.controller';
import { BannersService } from './banners.service';

@Module({
  controllers: [BannersController, ManufacturerAdsController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
