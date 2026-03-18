import { Controller, Get } from '@nestjs/common';
import { TaxService } from './tax.service';
import { Public } from '../auth/public.decorator';

@Controller('api/tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Public()
  @Get('rate')
  async getTaxRate() {
    return this.taxService.getRate();
  }
}
