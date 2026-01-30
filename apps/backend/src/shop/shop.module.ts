import { Module } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShippingService } from './shipping.service';

@Module({
  controllers: [ShopController],
  providers: [ShopService, ShippingService],
  exports: [ShopService, ShippingService],
})
export class ShopModule {}
