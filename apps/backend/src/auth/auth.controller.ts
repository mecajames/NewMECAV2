import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from './public.decorator';
import { SupabaseAdminService } from './supabase-admin.service';
import { EmailService } from '../email/email.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Self-service password reset request ("Send Reset Email" on the login page).
   *
   * We deliberately do NOT use supabase.auth.resetPasswordForEmail from the
   * client: that goes through Supabase's built-in mailer, which is throttled to
   * a few emails/hour project-wide and silently drops the rest. Instead we
   * generate the recovery link with the admin API (no email rate limit) and
   * deliver it through our own (SendGrid) mailer with a branded template.
   *
   * Always responds generically so the endpoint can't be used to enumerate
   * which emails have accounts.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() body: { email?: string; redirectTo?: string },
  ): Promise<{ success: boolean; message: string }> {
    const generic = {
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    };

    const email = (body?.email || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return generic; // never reveal validity
    }

    const redirectTo = this.resolveRedirectTo(body?.redirectTo);

    const result = await this.supabaseAdmin.generatePasswordRecoveryLink(email, redirectTo);
    if (!result.success || !result.link) {
      // notFound = no account for this email → respond generically. Real errors
      // (Supabase down, misconfig) get logged so we can see them server-side.
      if (result.error && !result.notFound) {
        this.logger.error(`forgot-password: link generation failed for ${email}: ${result.error}`);
      }
      return generic;
    }

    const sent = await this.emailService.sendPasswordResetLinkEmail({
      to: email,
      resetUrl: result.link,
    });
    if (!sent.success) {
      this.logger.error(`forgot-password: email send failed for ${email}: ${sent.error}`);
    } else {
      this.logger.log(`forgot-password: reset link emailed to ${email}`);
    }

    return generic;
  }

  /**
   * Only honour a client-supplied redirectTo if its origin is allow-listed and
   * it targets /reset-password — otherwise fall back to the configured frontend
   * URL. Prevents the endpoint being abused to mint recovery links that redirect
   * to an attacker-controlled site.
   */
  private resolveRedirectTo(requested?: string): string {
    const fallbackBase = (
      process.env.FRONTEND_URL ||
      process.env.CORS_ORIGIN?.split(',')[0] ||
      'http://localhost:5173'
    ).replace(/\/+$/, '');
    const fallback = `${fallbackBase}/reset-password`;

    if (!requested) return fallback;
    try {
      const url = new URL(requested);
      const allowed = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map((s) => s.trim().replace(/\/+$/, ''))
        .filter(Boolean);
      const originOk = allowed.some((a) => {
        try {
          return new URL(a).origin === url.origin;
        } catch {
          return false;
        }
      });
      if (originOk && url.pathname === '/reset-password') {
        return url.toString();
      }
    } catch {
      // fall through to fallback
    }
    return fallback;
  }
}
