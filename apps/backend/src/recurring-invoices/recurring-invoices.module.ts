import { Module } from '@nestjs/common';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { RecurringInvoicesController } from './recurring-invoices.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { UserActivityModule } from '../user-activity/user-activity.module';

@Module({
  imports: [InvoicesModule, UserActivityModule],
  controllers: [RecurringInvoicesController],
  providers: [RecurringInvoicesService],
  exports: [RecurringInvoicesService],
})
export class RecurringInvoicesModule {}
