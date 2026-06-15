// MECA IDs that can never have admin/staff access removed
export const PROTECTED_MECA_IDS = ['202401', '700947'];

/**
 * MikroORM WHERE clause that selects every profile the app considers an
 * admin — the query-level mirror of `isAdminUser()`. Use this whenever you
 * need to RESOLVE the set of admins from the DB (e.g. notification/email
 * recipients) so it stays in sync with the per-profile guard check.
 *
 * Matches role='admin' OR is_staff=true OR a protected MECA ID. Resolving
 * admins by `role` alone silently dropped admins who hold access via
 * is_staff / the protected-MECA-ID branch (James, 202401) from admin
 * alert emails AND bell notifications.
 */
export function adminRecipientWhere(): { $or: any[] } {
  return {
    $or: [
      { role: 'admin' },
      { is_staff: true },
      { meca_id: { $in: PROTECTED_MECA_IDS } },
    ],
  };
}

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

/**
 * Super-admin check — limited to James Ryan (202401) and Mick Makhool (700947).
 * These two are the only accounts allowed to perform irreversible cross-account
 * operations like MECA ID reassignment.
 */
export function isSuperAdmin(profile: { meca_id?: string } | null | undefined): boolean {
  if (!profile) return false;
  return PROTECTED_MECA_IDS.includes(String(profile.meca_id));
}
