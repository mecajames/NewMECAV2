import { Module, forwardRef } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { RemediationService } from './remediation.service';
import { ReconciliationController } from './reconciliation.controller';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../stripe/stripe.module';
import { PayPalModule } from '../paypal/paypal.module';
import { RefundsModule } from '../payments/refunds.module';
import { UserActivityModule } from '../user-activity/user-activity.module';

/**
 * Nightly DB-internal + daily live (gateway) billing reconciliation, the admin
 * reconciliation dashboard endpoints, and one-click remediation. Stripe/PayPal
 * are forwardRef'd — they carry their own module cycles.
 */
@Module({
  imports: [
    EmailModule,
    AuthModule,
    forwardRef(() => StripeModule),
    forwardRef(() => PayPalModule),
    RefundsModule,
    UserActivityModule,
  ],
  providers: [ReconciliationService, RemediationService],
  controllers: [ReconciliationController],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
