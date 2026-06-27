import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuthModule } from '../auth/auth.module';
import { PaymentFulfillmentModule } from './payment-fulfillment.module';

@Module({
  imports: [AuthModule, forwardRef(() => PaymentFulfillmentModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
