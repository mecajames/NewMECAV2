/**
 * Resolves the date to display in "Member Since" UI.
 *
 * profiles.member_since can be NULL (for legacy rows the original Feb 2026
 * migration didn't backfill) or in the future (when a user's only membership
 * row is a pre-paid / future-dated renewal, MIN(start_date) is in the future).
 * In both cases we fall back to created_at, which is never NULL and is always
 * the date the profile actually existed.
 */
export function resolveMemberSince(p: { member_since?: string | Date | null; created_at: string | Date }): Date {
  const createdAt = new Date(p.created_at);
  if (!p.member_since) return createdAt;
  const ms = new Date(p.member_since);
  if (isNaN(ms.getTime()) || ms.getTime() > Date.now()) return createdAt;
  return ms;
}
