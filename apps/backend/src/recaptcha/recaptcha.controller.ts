import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';

interface VerifyRecaptchaDto {
  token: string;
  action?: string;
}

@Controller('api/recaptcha')
export class RecaptchaController {
  constructor(private readonly recaptchaService: RecaptchaService) {}

  /**
   * Verify a reCAPTCHA token
   * POST /api/recaptcha/verify
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyRecaptchaDto): Promise<{ success: boolean; message: string }> {
    const isValid = await this.recaptchaService.verifyToken(dto.token, dto.action);
    
    return {
      success: isValid,
      message: isValid ? 'reCAPTCHA verification successful' : 'reCAPTCHA verification failed',
    };
  }
}
