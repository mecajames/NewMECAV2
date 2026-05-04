import { Migration } from '@mikro-orm/migrations';

/**
 * Adds infrastructure for the three provisioning modes on the admin Security
 * Audit page:
 *
 *   - `payment_status` enum gains an `inactive` value. Mode C (data-only
 *     provision, account locked) creates a membership in this state so
 *     historical records exist without granting login access.
 *
 *   - `profiles.restricted_to_billing` boolean. Mode B (pay-to-activate)
 *     creates the profile with this set, so the front-end route guard pins
 *     the user to /billing until they pay their invoice. Cleared by the
 *     payment-fulfillment pipeline once the invoice transitions to PAID.
 *
 *   - `profiles.provisioned_by` and `profiles.provisioned_at` — provenance for
 *     accounts created via the audit page. Useful for auditing and for the
 *     future "convert to full member" flow.
 */
export class Migration20260504200000_provisioning_modes extends Migration {
  async up(): Promise<void> {
    // Postgres only allows ALTER TYPE ... ADD VALUE outside a transaction
    // when the value is new — IF NOT EXISTS makes the migration idempotent.
    this.addSql(`ALTER TYPE "public"."payment_status" ADD VALUE IF NOT EXISTS 'inactive';`);

    this.addSql(`
      ALTER TABLE "public"."profiles"
        ADD COLUMN IF NOT EXISTS "restricted_to_billing" boolean NOT NULL DEFAULT false;
    `);

    this.addSql(`
      ALTER TABLE "public"."profiles"
        ADD COLUMN IF NOT EXISTS "provisioned_by" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
    `);

    this.addSql(`
      ALTER TABLE "public"."profiles"
        ADD COLUMN IF NOT EXISTS "provisioned_at" timestamptz;
    `);

    // Partial index for the front-end guard query (only relevant when set).
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_profiles_restricted_to_billing"
        ON "public"."profiles" ("id")
        WHERE "restricted_to_billing" = true;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "public"."idx_profiles_restricted_to_billing";`);
    this.addSql(`ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "provisioned_at";`);
    this.addSql(`ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "provisioned_by";`);
    this.addSql(`ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "restricted_to_billing";`);
    // Postgres can't drop an enum value cleanly — rolling back leaves it.
    // Re-running up() is a no-op thanks to IF NOT EXISTS.
  }
}
