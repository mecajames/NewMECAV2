import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactSubmission } from './contact.entity';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { RecaptchaModule } from '../recaptcha/recaptcha.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([ContactSubmission]),
    AuthModule,
    EmailModule,
    RecaptchaModule,
  ],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
