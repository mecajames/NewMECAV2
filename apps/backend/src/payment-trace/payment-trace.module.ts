import { Module, forwardRef } from '@nestjs/common';
import { PaymentTraceService } from './payment-trace.service';
import { PaymentTraceController } from './payment-trace.controller';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../stripe/stripe.module';

/**
 * Admin payment trace / chargeback lookup: resolve any gateway identifier
 * (Stripe pi_/ch_/sub_/cus_/in_/re_, PayPal subscription, invoice/order
 * number, MECA ID, email) to the member and their billing chain. Stripe is
 * forwardRef'd — it carries its own module cycles (same pattern as
 * ReconciliationModule).
 */
@Module({
  imports: [
    AuthModule,
    forwardRef(() => StripeModule),
  ],
  providers: [PaymentTraceService],
  controllers: [PaymentTraceController],
  exports: [PaymentTraceService],
})
export class PaymentTraceModule {}
