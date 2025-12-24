import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { MembershipsModule } from '../memberships/memberships.module';
import { PaymentsModule } from '../payments/payments.module';
import { QuickBooksModule } from '../quickbooks/quickbooks.module';
import { EventRegistrationsModule } from '../event-registrations/event-registrations.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    MembershipsModule,
    PaymentsModule,
    QuickBooksModule,
    EventRegistrationsModule,
    OrdersModule,
    InvoicesModule,
  ],
  providers: [StripeService],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {}
