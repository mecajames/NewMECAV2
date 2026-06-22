import { Module, Global, forwardRef } from '@nestjs/common';
import { RefundService } from './refund.service';
import { StripeModule } from '../stripe/stripe.module';
import { PayPalModule } from '../paypal/paypal.module';
import { QuickBooksModule } from '../quickbooks/quickbooks.module';

/**
 * Provides the central RefundService (the single path all refunds route through).
 * @Global so consumers (memberships, tickets, invoices, reconciliation, the
 * Stripe/PayPal webhook controllers) can inject RefundService WITHOUT importing
 * this module — an explicit import edge from invoices/etc. would close an ESM
 * module cycle (invoices → refunds → paypal → invoices). Still imported by
 * StripeModule/PayPalModule (with forwardRef) so it loads in the graph.
 */
@Global()
@Module({
  imports: [forwardRef(() => StripeModule), forwardRef(() => PayPalModule), QuickBooksModule],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundsModule {}
