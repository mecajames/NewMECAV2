import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { SiteSettingsModule } from '../site-settings/site-settings.module';

@Global()
@Module({
  imports: [SiteSettingsModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
