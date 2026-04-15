import { Module, forwardRef } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { MembershipsModule } from '../memberships/memberships.module';
import { PaymentsModule } from '../payments/payments.module';
import { PaymentFulfillmentModule } from '../payments/payment-fulfillment.module';
import { QuickBooksModule } from '../quickbooks/quickbooks.module';
import { EventRegistrationsModule } from '../event-registrations/event-registrations.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { AuthModule } from '../auth/auth.module';
import { ShopModule } from '../shop/shop.module';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { WorldFinalsModule } from '../world-finals/world-finals.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    forwardRef(() => MembershipsModule),
    PaymentsModule,
    PaymentFulfillmentModule,
    QuickBooksModule,
    EventRegistrationsModule,
    OrdersModule,
    InvoicesModule,
    AuthModule,
    forwardRef(() => ShopModule),
    SiteSettingsModule,
    forwardRef(() => WorldFinalsModule),
    CouponsModule,
  ],
  providers: [StripeService],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {}
