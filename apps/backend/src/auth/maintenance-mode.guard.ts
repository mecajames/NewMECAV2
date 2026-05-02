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
import { isAdminUser } from './is-admin.helper';
import { Profile } from '../profiles/profiles.entity';
import { SiteSettings } from '../site-settings/site-settings.entity';

/**
 * Combined access guard that enforces:
 *   1. Hard login bans (`profiles.login_banned`) — blocks every authenticated
 *      request regardless of maintenance mode.
 *   2. Maintenance mode — when site_settings.maintenance_mode_enabled is true,
 *      only admins and members with `maintenance_login_allowed = true` get
 *      through.
 */
@Injectable()
export class MaintenanceModeGuard implements CanActivate {
  private cachedEnabled: boolean = false;
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

    // Single profile lookup serves both checks below.
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id }, {
      fields: ['role', 'is_staff', 'meca_id', 'maintenance_login_allowed', 'login_banned'],
    });

    // 1. Hard ban — always blocks, regardless of maintenance state.
    if (profile?.login_banned) {
      throw new ForbiddenException('Your account has been disabled. Contact support if you believe this is an error.');
    }

    // 2. Maintenance mode check
    const maintenanceEnabled = await this.isMaintenanceEnabled();
    if (!maintenanceEnabled) return true;

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

  private async isMaintenanceEnabled(): Promise<boolean> {
    const now = Date.now();
    if (now < this.cacheExpiry) return this.cachedEnabled;

    try {
      const em = this.em.fork();
      const setting = await em.findOne(SiteSettings, {
        setting_key: 'maintenance_mode_enabled',
      });
      this.cachedEnabled = setting?.setting_value === 'true';
    } catch {
      // On DB error, don't block users — assume maintenance mode is off.
      this.cachedEnabled = false;
    }
    this.cacheExpiry = now + this.CACHE_TTL_MS;
    return this.cachedEnabled;
  }
}
