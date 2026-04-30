import { Module, forwardRef } from '@nestjs/common';
import { WorldFinalsService } from './world-finals.service';
import { WorldFinalsController } from './world-finals.controller';
import { EmailModule } from '../email/email.module';
import { StripeModule } from '../stripe/stripe.module';
import { AdminNotificationsModule } from '../admin-notifications/admin-notifications.module';

@Module({
  imports: [EmailModule, forwardRef(() => StripeModule), AdminNotificationsModule],
  providers: [WorldFinalsService],
  controllers: [WorldFinalsController],
  exports: [WorldFinalsService],
})
export class WorldFinalsModule {}
