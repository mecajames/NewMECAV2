/**
 * Feature-specific permission helpers used across the My MECA Dashboard and
 * member-only UI. Each helper is intentionally narrow so panels guard on a
 * single, named permission instead of recomputing inline checks.
 *
 * Sources of truth:
 *   - `profile.role`              — 'admin' | 'event_director' | 'judge' | 'user' | 'retailer' | 'manufacturer' | 'competitor'
 *   - `profile.is_staff`          — staff bypass
 *   - `profile.membership_status` — 'active' | 'expired' | 'none' | 'pending' | 'inactive'
 *   - `memberships` array on profile (if loaded) — category-by-category active status
 *
 * Comp memberships: a member sitting inside an active free_period is
 * considered active for all gates here. The frontend only sees the resolved
 * `membership_status` from the daily sync, which already accounts for comps
 * via the membership-sync service.
 */

type MaybeProfile =
  | (Partial<{
      role: string;
      is_staff: boolean;
      meca_id: string;
      membership_status: string;
      memberships: Array<{ category?: string; status?: string; endDate?: string | Date | null }>;
    }> | null
      | undefined);

const PROTECTED_MECA_IDS = new Set(['202401', '700947']); // James, Mick (super admins)

/**
 * Super-admin gate. ONLY James Ryan (MECA 202401) and Mick Makhool (MECA 700947).
 * Use for irreversible cross-account tools (MECA ID reassignment, etc.) where
 * even regular admins/staff should not have access.
 */
export function isSuperAdmin(profile: MaybeProfile): boolean {
  if (!profile) return false;
  return !!profile.meca_id && PROTECTED_MECA_IDS.has(String(profile.meca_id));
}

export function isAdmin(profile: MaybeProfile): boolean {
  if (!profile) return false;
  if (profile.meca_id && PROTECTED_MECA_IDS.has(String(profile.meca_id))) return true;
  return profile.role === 'admin' || profile.is_staff === true;
}

export function isStaff(profile: MaybeProfile): boolean {
  return !!profile && profile.is_staff === true;
}

export function hasActiveMembership(profile: MaybeProfile): boolean {
  return !!profile && profile.membership_status === 'active';
}

/** Event Directors get into ED-only tools regardless of paid-membership status. */
export function canSeeEDTools(profile: MaybeProfile): boolean {
  if (!profile) return false;
  return isAdmin(profile) || profile.role === 'event_director';
}

/** Judges get into Judge-only tools regardless of paid-membership status. */
export function canSeeJudgeTools(profile: MaybeProfile): boolean {
  if (!profile) return false;
  return isAdmin(profile) || profile.role === 'judge';
}

/**
 * Member can register for events, view their results, see member-only
 * content. Requires an ACTIVE paid membership in any category, OR a
 * role-exempt account (admin/staff/ED/judge — they may run events without
 * holding a competitor membership).
 */
export function canCompete(profile: MaybeProfile): boolean {
  if (!profile) return false;
  if (isAdmin(profile)) return true;
  return hasActiveMembership(profile);
}

/**
 * Member can manage a retailer/manufacturer listing. Requires an ACTIVE
 * retailer or manufacturer membership.
 */
export function canSeeRetailerTools(profile: MaybeProfile): boolean {
  if (!profile) return false;
  if (isAdmin(profile)) return true;
  if (!hasActiveMembership(profile)) return false;
  const r = profile.role;
  return r === 'retailer' || r === 'manufacturer';
}

/**
 * Anyone with ANY membership record (active or expired) can see billing
 * pages — they need access to download past invoices, dispute charges, etc.
 * Includes admins by default.
 */
export function canSeeMembershipBilling(profile: MaybeProfile): boolean {
  if (!profile) return false;
  if (isAdmin(profile)) return true;
  return profile.membership_status === 'active' || profile.membership_status === 'expired';
}

/** True if the viewer is the member-owner of the profile being viewed. */
export function isOwnProfile(profile: MaybeProfile, ownerId: string | null | undefined): boolean {
  if (!profile || !ownerId) return false;
  return (profile as any).id === ownerId;
}
