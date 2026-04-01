// MECA IDs that can never have admin/staff access removed
const PROTECTED_MECA_IDS = ['202401', '700947'];

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
  // Protected accounts always have admin access
  if (PROTECTED_MECA_IDS.includes(String(profile.meca_id))) return true;
  return profile.role === 'admin' || profile.is_staff === true;
}

/**
 * Checks if a profile is protected from staff/admin removal.
 */
export function isProtectedAccount(profile: { meca_id?: string } | null | undefined): boolean {
  if (!profile) return false;
  return PROTECTED_MECA_IDS.includes(String(profile.meca_id));
}
