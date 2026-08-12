import { Migration } from '@mikro-orm/migrations';

/**
 * competition_results.state_code exists on PROD (it's in the reference schema
 * dump, schema_baseline_20260121.sql) but was never created by any MikroORM
 * migration — so freshly-migrated local/dev databases are missing it, and
 * every query that selects the entity (or the link-competitors backfill,
 * which UPDATEs it) dies with `column "state_code" does not exist`.
 *
 * Additive + idempotent: a no-op on prod, creates the column where it's
 * missing.
 */
export class Migration20260811210000_add_competition_results_state_code extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "state_code" text;`);
  }

  async down(): Promise<void> {
    // Intentionally no drop — the column is part of the canonical prod schema.
  }
}
