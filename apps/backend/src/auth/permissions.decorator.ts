import { SetMetadata } from '@nestjs/common';

/**
 * Permissions decorator - Specifies required permissions for a route
 *
 * Usage:
 * @RequirePermissions('view_users', 'edit_user')
 * @RequirePermissions('manage_events')
 *
 * Can accept multiple permissions - user must have ALL specified permissions
 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * RequireAnyPermission decorator - User needs at least ONE of the permissions
 *
 * Usage:
 * @RequireAnyPermission('edit_user', 'delete_user')
 */
export const ANY_PERMISSION_KEY = 'any_permissions';
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSION_KEY, permissions);

/**
 * RequireRole decorator - Specifies required role(s) for a route
 *
 * Usage:
 * @RequireRole('admin')
 * @RequireRole('admin', 'system_admin')
 */
export const ROLES_KEY = 'roles';
export const RequireRole = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
