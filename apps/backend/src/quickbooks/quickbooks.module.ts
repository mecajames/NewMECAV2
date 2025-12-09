import { Module } from '@nestjs/common';
import { QuickBooksService } from './quickbooks.service';
import { QuickBooksController } from './quickbooks.controller';

@Module({
  providers: [QuickBooksService],
  controllers: [QuickBooksController],
  exports: [QuickBooksService],
})
export class QuickBooksModule {}
