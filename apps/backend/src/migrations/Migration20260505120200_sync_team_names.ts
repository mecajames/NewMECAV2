import { Migration } from '@mikro-orm/migrations';

/**
 * For retail / manufacturer teams that were initialized with a fallback
 * "<first_name>'s Team" name (because memberships.business_name was null
 * at backfill time), prefer the actual business name from their
 * retailer_listings / manufacturer_listings row when one exists.
 *
 * Idempotency: only updates rows that still have a fallback-style name
 * AND have a matching listing with a non-empty business_name. Re-running
 * after the team has been renamed is a no-op.
 */
export class Migration20260505120200_sync_team_names extends Migration {
  async up(): Promise<void> {
    // Retail teams: pull from retailer_listings.business_name
    this.addSql(`
      UPDATE "public"."teams" t
      SET name = rl.business_name, updated_at = now()
      FROM retailer_listings rl
      WHERE rl.user_id = t.captain_id
        AND rl.business_name IS NOT NULL
        AND TRIM(rl.business_name) <> ''
        AND t.team_type = 'shop'
        AND t.name LIKE '%''s Team'
        AND t.name <> rl.business_name;
    `);

    // Manufacturer teams: pull from manufacturer_listings.business_name
    this.addSql(`
      UPDATE "public"."teams" t
      SET name = ml.business_name, updated_at = now()
      FROM manufacturer_listings ml
      WHERE ml.user_id = t.captain_id
        AND ml.business_name IS NOT NULL
        AND TRIM(ml.business_name) <> ''
        AND t.team_type = 'club'
        AND t.name LIKE '%''s Team'
        AND t.name <> ml.business_name;
    `);
  }

  async down(): Promise<void> {
    // No automatic rollback — once renamed by an admin or owner, reverting
    // would clobber legitimate edits.
  }
}
