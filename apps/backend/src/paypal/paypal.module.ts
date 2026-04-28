import { Module, forwardRef } from '@nestjs/common';
import { PayPalService } from './paypal.service';
import { PayPalController } from './paypal.controller';
import { PaymentFulfillmentModule } from '../payments/payment-fulfillment.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { EventRegistrationsModule } from '../event-registrations/event-registrations.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { AuthModule } from '../auth/auth.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { ShopModule } from '../shop/shop.module';
import { TaxModule } from '../tax/tax.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    PaymentFulfillmentModule,
    forwardRef(() => MembershipsModule),
    EventRegistrationsModule,
    InvoicesModule,
    AuthModule,
    SiteSettingsModule,
    forwardRef(() => ShopModule),
    TaxModule,
    CouponsModule,
  ],
  providers: [PayPalService],
  controllers: [PayPalController],
  exports: [PayPalService],
})
export class PayPalModule {}
