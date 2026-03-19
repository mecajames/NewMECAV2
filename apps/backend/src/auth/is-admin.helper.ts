// MECA ID that can never have admin/staff access removed
const PROTECTED_MECA_ID = '202401';

/**
 * Checks if a profile has admin/staff access.
 * A user is considered admin if:
 * - Their role is 'admin', OR
 * - They have is_staff = true (staff flag independent of membership role)
 *
 * Accepts partial Profile objects (e.g., MikroORM Loaded<Profile> with only 'role' selected).
 */
export function isAdminUser(profile: { role?: string; is_staff?: boolean; meca_id?: string } | null | undefined): boolean {
  if (!profile) return false;
  // Protected account always has admin access
  if (String(profile.meca_id) === PROTECTED_MECA_ID) return true;
  return profile.role === 'admin' || profile.is_staff === true;
}

/**
 * Checks if a profile is protected from staff/admin removal.
 */
export function isProtectedAccount(profile: { meca_id?: string } | null | undefined): boolean {
  if (!profile) return false;
  return String(profile.meca_id) === PROTECTED_MECA_ID;
}
