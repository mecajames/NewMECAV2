import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityManager } from '@mikro-orm/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { isAdminUser, isProtectedAccount } from './is-admin.helper';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';
import { SiteSettings } from '../site-settings/site-settings.entity';

/**
 * Combined access guard that enforces:
 *   1. Hard login bans (`profiles.login_banned`) — blocks every authenticated
 *      request regardless of maintenance mode.
 *   2. Membership-required enforcement — when
 *      site_settings.enforce_membership_for_login is true, any profile with
 *      zero memberships is rejected. Closes the back-door where an admin
 *      adds a profile directly via SQL but never creates a membership row,
 *      leaving the account invisible on the Members page yet still able to
 *      authenticate. Protected accounts (PROTECTED_MECA_IDS) bypass this so
 *      a misconfigured super-admin can't be locked out of their own system.
 *   3. Maintenance mode — when site_settings.maintenance_mode_enabled is true,
 *      only admins and members with `maintenance_login_allowed = true` get
 *      through.
 */
@Injectable()
export class MaintenanceModeGuard implements CanActivate {
  private cachedMaintenance: boolean = false;
  private cachedEnforce: boolean = false;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 30_000;

  constructor(
    private readonly reflector: Reflector,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public routes are exempt from both ban and maintenance checks
    // (covers Stripe/PayPal webhooks, health checks, public listings, etc.)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const path: string = request.url || request.path || '';
    if (this.isExemptPath(path)) return true;

    const user = request.user;
    // No authenticated user — let the auth guard handle rejection.
    if (!user?.id) return true;

    // Single profile lookup serves all checks below.
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id }, {
      fields: ['id', 'role', 'is_staff', 'meca_id', 'maintenance_login_allowed', 'login_banned', 'can_login'],
    });

    // 1. Hard ban — always blocks, regardless of maintenance state.
    if (profile?.login_banned) {
      throw new ForbiddenException('Your account has been disabled. Contact support if you believe this is an error.');
    }

    // 1b. Login explicitly disabled by an admin (softer than ban — used by
    //     Mode-C "inactive" provisioning and the per-row Disable Login button
    //     on the security audit page).
    if (profile && profile.can_login === false) {
      throw new ForbiddenException('Your account login is currently disabled. Contact an administrator.');
    }

    // 2. Membership-required enforcement — closes the "profile without
    //    membership" back door. Skipped for protected super-admin accounts
    //    so they can't be permanently locked out.
    const { maintenance, enforce } = await this.loadFlags();
    if (enforce && profile && !isProtectedAccount(profile)) {
      const membershipCount = await em.count(Membership, { user: profile.id });
      if (membershipCount === 0) {
        throw new ForbiddenException(
          'Account is incomplete: no membership on file. Contact an administrator to provision your membership before logging in.',
        );
      }
    }

    // 3. Maintenance mode check
    if (!maintenance) return true;

    if (isAdminUser(profile)) return true;
    if (profile?.maintenance_login_allowed) return true;

    throw new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Site is under maintenance. Please try again later.',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private isExemptPath(path: string): boolean {
    const exemptPrefixes = [
      '/api/site-settings',
      '/api/auth',
      '/auth',
      '/site-settings',
    ];
    return exemptPrefixes.some(prefix => path.startsWith(prefix));
  }

  private async loadFlags(): Promise<{ maintenance: boolean; enforce: boolean }> {
    const now = Date.now();
    if (now < this.cacheExpiry) {
      return { maintenance: this.cachedMaintenance, enforce: this.cachedEnforce };
    }

    try {
      const em = this.em.fork();
      const settings = await em.find(SiteSettings, {
        setting_key: { $in: ['maintenance_mode_enabled', 'enforce_membership_for_login'] },
      });
      this.cachedMaintenance = settings.find(s => s.setting_key === 'maintenance_mode_enabled')?.setting_value === 'true';
      this.cachedEnforce = settings.find(s => s.setting_key === 'enforce_membership_for_login')?.setting_value === 'true';
    } catch {
      // On DB error, fail-open on both flags so the guard doesn't lock users
      // out due to transient infra problems.
      this.cachedMaintenance = false;
      this.cachedEnforce = false;
    }
    this.cacheExpiry = now + this.CACHE_TTL_MS;
    return { maintenance: this.cachedMaintenance, enforce: this.cachedEnforce };
  }
}
