import { Migration } from '@mikro-orm/migrations';

export class Migration20260202120000_add_subscription_fields extends Migration {
  async up(): Promise<void> {
    // Add stripe_subscription_id for active Stripe subscriptions
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text NULL;
    `);

    // Add had_legacy_subscription to track PMPro users who had recurring billing
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "had_legacy_subscription" boolean NOT NULL DEFAULT false;
    `);

    // Add index for stripe_subscription_id lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_memberships_stripe_subscription"
      ON "memberships" ("stripe_subscription_id")
      WHERE "stripe_subscription_id" IS NOT NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "idx_memberships_stripe_subscription";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "stripe_subscription_id";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "had_legacy_subscription";`);
  }
}
