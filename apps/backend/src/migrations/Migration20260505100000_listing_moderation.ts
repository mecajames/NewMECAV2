import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the moderation/approval workflow for retailer and manufacturer
 * directory listings, and tightens role permissions.
 *
 *   pending_changes (JSONB) — when a retailer/manufacturer edits an already-
 *     approved listing, the new field values land here while the live row
 *     keeps serving the public directory unchanged. An admin reviews via the
 *     moderation queue and either approves (pending_changes are merged onto
 *     the live row) or rejects (pending_changes is cleared, optional reason
 *     stored in pending_review_notes).
 *
 *   pending_submitted_at — timestamp of the most recent pending submission;
 *     drives the "oldest pending first" sort in the moderation queue.
 *
 *   pending_review_notes — optional reason text, written by admin on reject.
 *
 *   Permission cleanup — retailer and manufacturer roles no longer carry the
 *   admin-tier `manage_business_listings`, `manage_directory_listings` or
 *   `manage_banner_ads` permissions. Editing one's own listing is gated by
 *   ownership at the /api/business-listings/my/* endpoints, not by a
 *   permission grant.
 */
export class Migration20260505100000_listing_moderation extends Migration {
  async up(): Promise<void> {
    // ── Schema additions ──────────────────────────────────────────────
    for (const table of ['retailer_listings', 'manufacturer_listings']) {
      this.addSql(`
        ALTER TABLE "public"."${table}"
          ADD COLUMN IF NOT EXISTS "pending_changes" jsonb,
          ADD COLUMN IF NOT EXISTS "pending_submitted_at" timestamptz,
          ADD COLUMN IF NOT EXISTS "pending_review_notes" text;
      `);
      // Partial index: moderation queue queries only rows with pending edits.
      this.addSql(`
        CREATE INDEX IF NOT EXISTS "idx_${table}_pending"
          ON "public"."${table}" ("pending_submitted_at")
          WHERE "pending_changes" IS NOT NULL;
      `);
    }

    // ── Permission cleanup ────────────────────────────────────────────
    // Strip admin-tier permissions from retailer + manufacturer. Their access
    // to their own listing is ownership-gated by the /my/* endpoints.
    this.addSql(`
      DELETE FROM role_permissions
      WHERE role IN ('retailer', 'manufacturer')
        AND permission_id IN (
          SELECT id FROM permissions
          WHERE name IN ('manage_business_listings', 'manage_directory_listings', 'manage_banner_ads')
        );
    `);
  }

  async down(): Promise<void> {
    // Restore the permissions on rollback so prior state matches exactly.
    this.addSql(`
      INSERT INTO role_permissions (role, permission_id)
      SELECT r.role, p.id
      FROM (VALUES ('retailer'), ('manufacturer')) AS r(role)
      CROSS JOIN permissions p
      WHERE p.name IN ('manage_business_listings', 'manage_directory_listings', 'manage_banner_ads')
      ON CONFLICT DO NOTHING;
    `);

    for (const table of ['retailer_listings', 'manufacturer_listings']) {
      this.addSql(`DROP INDEX IF EXISTS "public"."idx_${table}_pending";`);
      this.addSql(`
        ALTER TABLE "public"."${table}"
          DROP COLUMN IF EXISTS "pending_review_notes",
          DROP COLUMN IF EXISTS "pending_submitted_at",
          DROP COLUMN IF EXISTS "pending_changes";
      `);
    }
  }
}
