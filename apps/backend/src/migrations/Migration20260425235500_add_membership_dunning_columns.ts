import { Migration } from '@mikro-orm/migrations';

/**
 * Adds dunning tracking columns to memberships so the daily cron knows which
 * step (1=day1, 2=day3, 3=day7, 4=auto-suspend) was last delivered to a
 * member with a failed payment, and when. Without this we couldn't escalate
 * (every cron run would re-send step 1) and couldn't auto-suspend at day 14.
 */
export class Migration20260425235500_add_membership_dunning_columns extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."memberships"
        ADD COLUMN IF NOT EXISTS "last_dunning_step" integer,
        ADD COLUMN IF NOT EXISTS "last_dunning_at"   timestamptz;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."memberships"
        DROP COLUMN IF EXISTS "last_dunning_at",
        DROP COLUMN IF EXISTS "last_dunning_step";
    `);
  }
}
