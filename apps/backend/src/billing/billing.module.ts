import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [OrdersModule, InvoicesModule],
  controllers: [BillingController],
})
export class BillingModule {}
