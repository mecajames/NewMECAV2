import { Module, Global } from '@nestjs/common';
import { SiteSettingsModule } from '../site-settings/site-settings.module';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';

@Global()
@Module({
  imports: [SiteSettingsModule],
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
