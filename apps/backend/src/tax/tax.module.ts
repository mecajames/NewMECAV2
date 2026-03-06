import { Module, Global } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';

@Global()
@Module({
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
