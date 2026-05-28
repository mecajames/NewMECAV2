import { Migration } from '@mikro-orm/migrations';

/**
 * Backfills and repairs profiles.member_since.
 *
 * The original migration (Migration20260220000000_add_member_since) populated
 * member_since from MIN(memberships.start_date). That left two bad cases that
 * surface in the admin Members list:
 *
 *   1. NULL — profiles with no membership row at the time the original
 *      migration ran. The frontend renders these as 12/31/1969 because
 *      `new Date(null)` is the Unix epoch.
 *
 *   2. Future-dated — profiles whose only / earliest membership row is a
 *      pre-paid renewal with a future start_date. MIN(start_date) returned
 *      that future date, so member_since was set into the future (e.g.
 *      5/31/2027 for a user created in 2026).
 *
 * This migration repairs both. For every row matching the criteria, it sets
 *   member_since = LEAST(
 *     created_at,
 *     COALESCE(MIN(start_date) where start_date <= created_at, created_at)
 *   )
 *
 * That ensures member_since is never later than created_at and never picks a
 * future-dated renewal. Rows where member_since is already a valid historical
 * date (including V1-imported dates earlier than created_at) are left alone.
 *
 * A complementary V1-history backfill (apps/backend/src/scripts/backfill-member-since-from-v1.ts)
 * can be run separately to set more accurate dates for pre-V2 members; it
 * only updates rows where the V1 date is earlier than what's stored, so it
 * composes cleanly with this one.
 */
export class Migration20260528120000_backfill_member_since_nulls extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      UPDATE "public"."profiles" p
      SET member_since = LEAST(
        p.created_at,
        COALESCE(
          (
            SELECT MIN(m.start_date)
            FROM "public"."memberships" m
            WHERE m.user_id = p.id
              AND m.start_date IS NOT NULL
              AND m.start_date <= p.created_at
          ),
          p.created_at
        )
      )
      WHERE p.member_since IS NULL
         OR p.member_since > p.created_at
         OR p.member_since > now();
    `);
  }

  override async down(): Promise<void> {
    // No-op: this is a data repair, not a schema change. Reversing it would
    // mean restoring rows to NULL or to a previously-bad future date, which
    // is destructive and not safely automatable.
  }
}
