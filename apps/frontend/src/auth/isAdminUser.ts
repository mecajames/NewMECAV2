/**
 * Checks if a profile has admin/staff access.
 * Mirrors the backend isAdminUser() helper.
 *
 * Use this for non-hook contexts (e.g., inline checks, utility functions).
 * In components, prefer usePermissions().isAdmin instead.
 */
export function isAdminUser(
  profile: { role?: string; is_staff?: boolean } | null | undefined,
): boolean {
  if (!profile) return false;
  return profile.role === 'admin' || profile.is_staff === true;
}
