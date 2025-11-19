import { Module } from '@nestjs/common';
import { RecaptchaController } from './recaptcha.controller';
import { RecaptchaService } from './recaptcha.service';

@Module({
  controllers: [RecaptchaController],
  providers: [RecaptchaService],
  exports: [RecaptchaService], // Export so other modules can use it
})
export class RecaptchaModule {}
