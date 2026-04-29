import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { EventRegistrationsModule } from '../event-registrations/event-registrations.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { ShopModule } from '../shop/shop.module';

@Module({
  imports: [OrdersModule, InvoicesModule, EventRegistrationsModule, MembershipsModule, ShopModule],
  controllers: [BillingController],
})
export class BillingModule {}
