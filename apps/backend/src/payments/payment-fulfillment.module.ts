import { Module, forwardRef } from '@nestjs/common';
import { PaymentFulfillmentService } from './payment-fulfillment.service';
import { MembershipsModule } from '../memberships/memberships.module';
import { QuickBooksModule } from '../quickbooks/quickbooks.module';
import { EventRegistrationsModule } from '../event-registrations/event-registrations.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ShopModule } from '../shop/shop.module';
import { WorldFinalsModule } from '../world-finals/world-finals.module';
import { AdminNotificationsModule } from '../admin-notifications/admin-notifications.module';

@Module({
  imports: [
    forwardRef(() => MembershipsModule),
    QuickBooksModule,
    EventRegistrationsModule,
    OrdersModule,
    InvoicesModule,
    forwardRef(() => ShopModule),
    forwardRef(() => WorldFinalsModule),
    AdminNotificationsModule,
  ],
  providers: [PaymentFulfillmentService],
  exports: [PaymentFulfillmentService],
})
export class PaymentFulfillmentModule {}
