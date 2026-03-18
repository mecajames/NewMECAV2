import { Module } from '@nestjs/common';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [SiteSettingsModule],
  controllers: [ShopController],
  providers: [ShopService, ShippingService],
  exports: [ShopService, ShippingService],
})
export class ShopModule {}
