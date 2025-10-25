import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityManager } from '@mikro-orm/core';
import { PERMISSIONS_KEY, ANY_PERMISSION_KEY, ROLES_KEY } from './permissions.decorator';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '../types/enums';

/**
 * PermissionGuard - Checks if user has required permissions/roles
 *
 * This guard is extensible and will work with the permission system when implemented.
 * For now, it uses role-based checks.
 *
 * Usage:
 * @UseGuards(AuthGuard, PermissionGuard)
 * @RequirePermissions('view_users')
 *
 * Note: AuthGuard must run BEFORE PermissionGuard
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly em: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: Profile = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check role-based access first
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        throw new ForbiddenException(`Requires one of these roles: ${requiredRoles.join(', ')}`);
      }
    }

    // Check permission-based access (ALL permissions required)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions) {
      const hasPermissions = await this.checkUserPermissions(
        user,
        requiredPermissions,
        'all',
      );
      if (!hasPermissions) {
        throw new ForbiddenException(
          `Missing required permissions: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    // Check permission-based access (ANY permission required)
    const anyPermissions = this.reflector.getAllAndOverride<string[]>(
      ANY_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (anyPermissions) {
      const hasAnyPermission = await this.checkUserPermissions(
        user,
        anyPermissions,
        'any',
      );
      if (!hasAnyPermission) {
        throw new ForbiddenException(
          `Missing one of required permissions: ${anyPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }

  /**
   * Check if user has required permissions
   * This is extensible - will integrate with permission system when available
   */
  private async checkUserPermissions(
    user: Profile,
    permissions: string[],
    mode: 'all' | 'any',
  ): Promise<boolean> {
    // System admin has all permissions
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // TODO: When permission system is implemented, check via database function
    // For now, use role-based permission mapping
    const rolePermissions = this.getRolePermissions(user.role);

    if (mode === 'all') {
      return permissions.every((perm) => rolePermissions.includes(perm));
    } else {
      return permissions.some((perm) => rolePermissions.includes(perm));
    }
  }

  /**
   * Temporary role-to-permission mapping
   * This will be replaced by database-driven permission system
   */
  private getRolePermissions(role: UserRole): string[] {
    const permissionMap: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: ['*'], // Admin has all permissions
      [UserRole.EVENT_DIRECTOR]: [
        'view_events',
        'create_event',
        'edit_event',
        'manage_registrations',
        'view_results',
        'enter_results',
        'edit_results',
      ],
      [UserRole.RETAILER]: [
        'view_events',
        'view_results',
        'manage_directory_listings',
        'manage_banner_ads',
      ],
      [UserRole.USER]: ['view_events', 'view_results'],
    };

    const permissions = permissionMap[role] || [];

    // Wildcard permission means all permissions
    if (permissions.includes('*')) {
      return ['*'];
    }

    return permissions;
  }
}
