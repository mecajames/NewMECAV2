import { BadRequestException, Body, Controller, ForbiddenException, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EntityManager } from '@mikro-orm/core';
import { Public } from './public.decorator';
import { SupabaseAdminService } from './supabase-admin.service';
import { EmailService } from '../email/email.service';

// NOTE: must be 'api/auth', not 'auth'. nginx only proxies /api/* to the
// backend (the SPA owns /auth/*), and there is no global 'api' prefix — every
// proxied controller carries the api/ prefix itself (cf. @Controller('api/user-activity')).
// Without it these routes are unreachable in production (nginx 405s /auth/*,
// and /api/auth/* reaches the backend but matches no route → 404).
@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly emailService: EmailService,
    private readonly em: EntityManager,
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

    // Personalize the email (name + MECA ID). The account exists at this point
    // (link generation succeeded), so this lookup never leaks account validity.
    let firstName: string | undefined;
    let mecaId: string | number | undefined;
    try {
      const prof = await this.em.getConnection().execute(
        `SELECT first_name, meca_id FROM public.profiles WHERE lower(email) = ? LIMIT 1`,
        [email],
      );
      firstName = prof?.[0]?.first_name || undefined;
      mecaId = prof?.[0]?.meca_id ?? undefined;
    } catch {
      // non-fatal — fall back to an unpersonalized greeting
    }

    const sent = await this.emailService.sendPasswordResetLinkEmail({
      to: email,
      resetUrl: result.link,
      firstName,
      mecaId,
    });
    if (!sent.success) {
      this.logger.error(`forgot-password: email send failed for ${email}: ${sent.error}`);
    } else {
      this.logger.log(`forgot-password: reset link emailed to ${email}`);
    }

    return generic;
  }

  /**
   * Auto-recovery for migrated members who never set a password.
   *
   * The 2026-03 V1→V2 import created ~4,000 auth accounts with a placeholder
   * password the member never chose and never received a setup email for. For
   * those accounts a password sign-in can NEVER succeed, so the login page shows
   * a dead-end "Invalid login credentials" with no path forward (the member has
   * to somehow know to click "Forgot password?"). This endpoint is called by the
   * login page right after a failed password attempt: if the email belongs to an
   * account that has never completed a sign-in (or is still flagged
   * force_password_change), we email them the same branded set-password link the
   * Forgot Password flow uses and tell the UI to show a helpful message instead.
   *
   * For everyone else — a real user who simply mistyped — we respond generically
   * and send NOTHING. That keeps this from being used to enumerate accounts or to
   * spam password-reset emails at active users. login_banned / can_login=false
   * accounts are also skipped (they are not permitted to sign in at all).
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login-recovery')
  @HttpCode(HttpStatus.OK)
  async loginRecovery(
    @Body() body: { email?: string; redirectTo?: string },
  ): Promise<{ passwordSetupRequired: boolean }> {
    const notRequired = { passwordSetupRequired: false };

    const email = (body?.email || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return notRequired;
    }

    // auth.users isn't a MikroORM entity, so read it directly. We need
    // last_sign_in_at (null => never completed a sign-in => never set a usable
    // password) plus the profile flags that gate whether this account is even
    // allowed to log in. Any failure here degrades silently to the normal error.
    let row:
      | {
          last_sign_in_at: Date | null;
          recovery_sent_at: Date | null;
          force_password_change: boolean | null;
          login_banned: boolean | null;
          can_login: boolean | null;
          first_name: string | null;
          meca_id: string | number | null;
        }
      | undefined;
    try {
      const rows = await this.em.getConnection().execute(
        `SELECT u.last_sign_in_at,
                u.recovery_sent_at,
                p.force_password_change,
                p.login_banned,
                p.can_login,
                p.first_name,
                p.meca_id
           FROM auth.users u
           LEFT JOIN public.profiles p ON p.id = u.id
          WHERE lower(u.email) = ?
          LIMIT 1`,
        [email],
      );
      row = rows?.[0];
    } catch (err) {
      this.logger.error(`login-recovery: lookup failed for ${email}: ${err}`);
      return notRequired;
    }

    if (!row) return notRequired; // no account → generic, no enumeration
    if (row.login_banned === true || row.can_login === false) return notRequired;

    const neverSignedIn = row.last_sign_in_at == null;
    const mustSetPassword = row.force_password_change === true;
    if (!neverSignedIn && !mustSetPassword) {
      // Established, activated user who simply mistyped — show the normal error.
      return notRequired;
    }

    // Don't re-send on rapid retries: if a recovery link went out in the last
    // 10 minutes, skip the send but still tell the UI to show the helpful copy.
    if (row.recovery_sent_at) {
      const ageMs = Date.now() - new Date(row.recovery_sent_at).getTime();
      if (ageMs < 10 * 60_000) {
        return { passwordSetupRequired: true };
      }
    }

    const redirectTo = this.resolveRedirectTo(body?.redirectTo);
    const result = await this.supabaseAdmin.generatePasswordRecoveryLink(email, redirectTo);
    if (result.success && result.link) {
      const sent = await this.emailService.sendPasswordResetLinkEmail({
        to: email,
        resetUrl: result.link,
        firstName: row.first_name || undefined,
        mecaId: row.meca_id ?? undefined,
      });
      if (sent.success) {
        this.logger.log(`login-recovery: set-password link emailed to never-activated account ${email}`);
      } else {
        this.logger.error(`login-recovery: email send failed for ${email}: ${sent.error}`);
      }
    } else if (result.error && !result.notFound) {
      this.logger.error(`login-recovery: link generation failed for ${email}: ${result.error}`);
    }

    return { passwordSetupRequired: true };
  }

  /**
   * Lightweight "does a login account already exist for this email?" check, used
   * by the membership signup form. Without it, a returning member who forgot they
   * already have an account fills out the guest signup, PAYS, and only then fails
   * account creation (the email's auth user already exists) — money taken with no
   * usable account created. Detecting it up front lets the UI send them to log in
   * / reset their password before paying.
   *
   * Returns only booleans (no profile data) and is throttled. It does reveal that
   * an account exists for an email, which the signup UX needs in order to guide
   * the user — the same thing any "email already registered" signup check does.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('account-exists')
  @HttpCode(HttpStatus.OK)
  async accountExists(
    @Body() body: { email?: string },
  ): Promise<{ exists: boolean; canLogin: boolean; hasActiveMembership: boolean }> {
    const email = (body?.email || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { exists: false, canLogin: false, hasActiveMembership: false };
    }
    try {
      const rows = await this.em.getConnection().execute(
        `SELECT
            p.can_login AS can_login,
            (
              EXISTS (
                SELECT 1 FROM public.memberships m
                 WHERE m.user_id = u.id
                   AND m.payment_status = 'paid'
                   AND (m.end_date IS NULL OR m.end_date > now())
              )
              -- ...AND the account is not flagged expired. An admin can mark a
              -- member expired (or the expired-login gate applies) while a stale
              -- membership row still looks current; such a member CANNOT log in
              -- and must use the inline guest-renewal flow, not "log in".
              -- (membership_status is a Postgres enum → use IS DISTINCT FROM,
              -- which also treats NULL as not-expired.)
              AND p.membership_status IS DISTINCT FROM 'expired'
            ) AS has_active_membership
           FROM auth.users u
           LEFT JOIN public.profiles p ON p.id = u.id
          WHERE lower(u.email) = ?
          LIMIT 1`,
        [email],
      );
      if (rows?.[0]) {
        return {
          exists: true,
          canLogin: rows[0].can_login !== false,
          // "Active" (→ tell them to log in) requires BOTH a current paid
          // membership AND a non-expired profile status. A member is treated as
          // renewable (→ inline set-password + renew) if EITHER the membership
          // lapsed by date OR the profile is flagged expired — both mean they
          // can't currently log in (the expired-login gate signs them out), so
          // "please log in" / a reset link would be a dead end.
          hasActiveMembership: rows[0].has_active_membership === true,
        };
      }
    } catch (err) {
      this.logger.error(`account-exists: lookup failed for ${email}: ${err}`);
    }
    return { exists: false, canLogin: false, hasActiveMembership: false };
  }

  /**
   * Set a password on an EXISTING account during membership checkout, so a
   * returning member whose password didn't carry over from the old site (the
   * 2026-03 import left ~4,000 password-less accounts) — or whose membership
   * lapsed — can renew without a dead-end "log in / forgot password" step.
   *
   * SCOPED to accounts with NO ACTIVE membership: those are exactly the
   * locked-out members who legitimately need to set a password to get back in,
   * and there is no live session to hijack. An account WITH an active
   * membership is rejected (those people can already sign in). Throttled.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('claim-account')
  @HttpCode(HttpStatus.OK)
  async claimAccount(
    @Body() body: { email?: string; password?: string },
  ): Promise<{ success: boolean }> {
    const email = (body?.email || '').trim().toLowerCase();
    const password = body?.password || '';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('A valid email is required.');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const found = await this.supabaseAdmin.findUserByEmail(email);
    if (!found.userId) {
      throw new BadRequestException('No account was found for that email.');
    }

    // Only locked-out members (no active membership) may set a password this
    // way; an active membership means they can already sign in.
    const rows = await this.em.getConnection().execute(
      `SELECT EXISTS (
          SELECT 1 FROM public.memberships m
           WHERE m.user_id = ?
             AND m.payment_status = 'paid'
             AND (m.end_date IS NULL OR m.end_date > now())
        ) AS has_active_membership`,
      [found.userId],
    );
    if (rows?.[0]?.has_active_membership === true) {
      throw new ForbiddenException('This account has an active membership — please sign in instead.');
    }

    const result = await this.supabaseAdmin.resetPassword({
      userId: found.userId,
      newPassword: password,
      forcePasswordChange: false,
    });
    if (!result.success) {
      throw new BadRequestException(result.error || 'Could not set your password. Please try again.');
    }
    return { success: true };
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
