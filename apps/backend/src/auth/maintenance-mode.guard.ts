import {
  Injectable,
  CanActivate,
  ExecutionContext,
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

@Injectable()
export class MaintenanceModeGuard implements CanActivate {
  private cachedEnabled: boolean = false;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 30_000; // 30 seconds

  constructor(
    private readonly reflector: Reflector,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check cache first — fast path when maintenance mode is off
    const now = Date.now();
    if (now < this.cacheExpiry) {
      if (!this.cachedEnabled) return true;
    } else {
      // Refresh cache
      await this.refreshCache();
      if (!this.cachedEnabled) return true;
    }

    // Maintenance mode is ON — check exemptions

    // 1. Public routes are exempt (covers Stripe webhook, health checks, etc.)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Exempt specific route paths needed for admin login and toggle
    const request = context.switchToHttp().getRequest();
    const path: string = request.url || request.path || '';
    if (this.isExemptPath(path)) return true;

    // 3. Check if the requesting user is an admin
    const user = request.user;
    if (user?.id) {
      const em = this.em.fork();
      const profile = await em.findOne(Profile, { id: user.id }, {
        fields: ['role', 'is_staff', 'meca_id'],
      });
      if (isAdminUser(profile)) return true;
    }

    // Block the request
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

  private async refreshCache(): Promise<void> {
    try {
      const em = this.em.fork();
      const setting = await em.findOne(SiteSettings, {
        setting_key: 'maintenance_mode_enabled',
      });
      this.cachedEnabled = setting?.setting_value === 'true';
    } catch {
      // On DB error, don't block users — assume maintenance mode is off
      this.cachedEnabled = false;
    }
    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
  }
}
