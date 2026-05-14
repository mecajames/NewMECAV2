import { Module, forwardRef } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { MembershipRenewalController } from './membership-renewal.controller';
import { MembershipsService } from './memberships.service';
import { MecaIdService } from './meca-id.service';
import { MasterSecondaryService } from './master-secondary.service';
import { MembershipSyncService } from './membership-sync.service';
import { MembershipRenewalTokenService } from './membership-renewal-token.service';
import { TeamsModule } from '../teams/teams.module';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../stripe/stripe.module';
import { UserActivityModule } from '../user-activity/user-activity.module';
import { AdminNotificationsModule } from '../admin-notifications/admin-notifications.module';
import { PaymentFulfillmentModule } from '../payments/payment-fulfillment.module';
import { CompetitionResultsModule } from '../competition-results/competition-results.module';
import { TaxModule } from '../tax/tax.module';
import { PayPalModule } from '../paypal/paypal.module';

@Module({
  imports: [
    forwardRef(() => TeamsModule),
    AuthModule,
    forwardRef(() => StripeModule),
    UserActivityModule,
    AdminNotificationsModule,
    forwardRef(() => PaymentFulfillmentModule),
    forwardRef(() => CompetitionResultsModule),
    TaxModule,
    forwardRef(() => PayPalModule),
  ],
  controllers: [MembershipsController, MembershipRenewalController],
  providers: [MembershipsService, MecaIdService, MasterSecondaryService, MembershipSyncService, MembershipRenewalTokenService],
  exports: [MembershipsService, MecaIdService, MasterSecondaryService, MembershipSyncService, MembershipRenewalTokenService],
})
export class MembershipsModule {}
