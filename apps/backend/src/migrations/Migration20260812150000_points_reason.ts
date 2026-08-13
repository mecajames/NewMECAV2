import { Migration } from '@mikro-orm/migrations';

/**
 * Per-result points explanation. Every points recalculation now stamps WHY a
 * row got (or didn't get) points — awarded/held/guest/expired/ineligible
 * category/needs class review/manual override/no season config — so admins
 * never again stare at a silent 0 wondering what happened (prod, 2026-08-12).
 *
 * Additive + idempotent.
 */
export class Migration20260812150000_points_reason extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "points_reason" text;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_results" DROP COLUMN IF EXISTS "points_reason";`);
  }
}
