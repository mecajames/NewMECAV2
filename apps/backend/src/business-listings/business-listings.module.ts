import { Module } from '@nestjs/common';
import { BusinessListingsService } from './business-listings.service';
import { BusinessListingsController } from './business-listings.controller';

@Module({
  controllers: [BusinessListingsController],
  providers: [BusinessListingsService],
  exports: [BusinessListingsService],
})
export class BusinessListingsModule {}
