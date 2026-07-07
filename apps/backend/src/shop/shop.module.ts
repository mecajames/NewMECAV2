import { Module } from '@nestjs/common';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShippingService } from './shipping.service';

// RefundService comes from the @Global RefundsModule — do NOT add an explicit
// RefundsModule import here: it closes a module cycle (shop → refunds →
// stripe/paypal → shop).
@Module({
  imports: [SiteSettingsModule, OrdersModule, InvoicesModule],
  controllers: [ShopController],
  providers: [ShopService, ShippingService],
  exports: [ShopService, ShippingService],
})
export class ShopModule {}
