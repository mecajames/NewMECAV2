import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { PERMISSIONS_KEY, ANY_PERMISSION_KEY, ROLES_KEY } from './permissions.decorator';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from './is-admin.helper';
import { PermissionsService } from '../permissions/permissions.service';

/**
 * PermissionGuard — checks roles and DB-driven permissions.
 *
 * Must run AFTER GlobalAuthGuard (which sets request.user from the Supabase token).
 * This guard loads the Profile from the DB and checks:
 *   1. @RequireRole() — role-based access
 *   2. @RequirePermissions() — all listed permissions required (DB-driven)
 *   3. @RequireAnyPermission() — at least one permission required (DB-driven)
 *
 * Admin/staff users (isAdminUser) bypass all permission checks.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly em: EntityManager,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Load the profile (with role + is_staff + meca_id)
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id }, {
      fields: ['id', 'role', 'is_staff', 'meca_id'] as any,
    });

    if (!profile) {
      throw new ForbiddenException('User profile not found');
    }

    // Attach profile to request for downstream use
    request.profile = profile;

    const isAdmin = isAdminUser(profile);

    // ── 1. Role check ───────────────────────────────────────────
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles) {
      // Admins/staff pass any role check
      if (!isAdmin && !requiredRoles.includes(profile.role || '')) {
        throw new ForbiddenException(`Requires one of these roles: ${requiredRoles.join(', ')}`);
      }
    }

    // ── 2. All-permissions check ────────────────────────────────
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredPermissions && !isAdmin) {
      for (const perm of requiredPermissions) {
        const has = await this.permissionsService.hasPermission(
          profile.id,
          profile.role || 'user',
          profile.is_staff,
          perm,
          profile.meca_id,
        );
        if (!has) {
          throw new ForbiddenException(`Missing required permission: ${perm}`);
        }
      }
    }

    // ── 3. Any-permission check ─────────────────────────────────
    const anyPermissions = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (anyPermissions && !isAdmin) {
      let hasAny = false;
      for (const perm of anyPermissions) {
        const has = await this.permissionsService.hasPermission(
          profile.id,
          profile.role || 'user',
          profile.is_staff,
          perm,
          profile.meca_id,
        );
        if (has) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) {
        throw new ForbiddenException(`Requires one of: ${anyPermissions.join(', ')}`);
      }
    }

    return true;
  }
}
