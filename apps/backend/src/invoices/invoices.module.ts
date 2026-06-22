import { Module, forwardRef } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoicePdfService } from './pdf/invoice-pdf.service';
import { ReceiptPdfService } from './pdf/receipt-pdf.service';
import { EmailModule } from '../email/email.module';
import { StripeModule } from '../stripe/stripe.module';
import { UserActivityModule } from '../user-activity/user-activity.module';

// RefundService is consumed here (invoice refund → RefundService.issueRefund) but
// RefundsModule is @Global, so it's injectable WITHOUT importing it — importing it
// would create an ESM module cycle (invoices → refunds → paypal → invoices).
@Module({
  imports: [EmailModule, forwardRef(() => StripeModule), UserActivityModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService, ReceiptPdfService],
  exports: [InvoicesService, InvoicePdfService, ReceiptPdfService],
})
export class InvoicesModule {}
