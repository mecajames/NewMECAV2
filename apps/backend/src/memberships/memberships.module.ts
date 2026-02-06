import { Module, forwardRef } from '@nestjs/common';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { MecaIdService } from './meca-id.service';
import { MasterSecondaryService } from './master-secondary.service';
import { MembershipSyncService } from './membership-sync.service';
import { TeamsModule } from '../teams/teams.module';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [forwardRef(() => TeamsModule), AuthModule, forwardRef(() => StripeModule)],
  controllers: [MembershipsController],
  providers: [MembershipsService, MecaIdService, MasterSecondaryService, MembershipSyncService],
  exports: [MembershipsService, MecaIdService, MasterSecondaryService, MembershipSyncService],
})
export class MembershipsModule {}
