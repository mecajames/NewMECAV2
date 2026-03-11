import { Controller, Get } from '@nestjs/common';
import { TaxService } from './tax.service';

@Controller('api/tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get('rate')
  getTaxRate() {
    return this.taxService.getRate();
  }
}
