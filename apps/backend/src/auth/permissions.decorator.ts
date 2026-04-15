import { SetMetadata } from '@nestjs/common';

/**
 * RequirePermissions - User must have ALL specified permissions.
 *
 * Usage:
 *   @RequirePermissions('manage_events')
 *   @RequirePermissions('view_users', 'edit_user')
 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * RequireAnyPermission - User must have at least ONE of the specified permissions.
 *
 * Usage:
 *   @RequireAnyPermission('edit_user', 'manage_users')
 */
export const ANY_PERMISSION_KEY = 'any_permissions';
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSION_KEY, permissions);

/**
 * RequireRole - User must have one of the specified roles.
 *
 * Usage:
 *   @RequireRole('admin')
 *   @RequireRole('admin', 'event_director')
 */
export const ROLES_KEY = 'roles';
export const RequireRole = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
