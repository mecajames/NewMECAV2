import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the manual points-override columns to competition_results. These let a
 * super-admin set a one-off points value on a single result that the automatic
 * recalculation (updateEventPoints) will NOT overwrite. Additive + idempotent.
 */
export class Migration20260621190000_manual_points_override extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "points_manual_override" boolean NOT NULL DEFAULT false;`);
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "points_override_reason" text NULL;`);
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "points_override_by" uuid NULL;`);
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "points_override_at" timestamptz NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_results" DROP COLUMN IF EXISTS "points_override_at";`);
    this.addSql(`ALTER TABLE "public"."competition_results" DROP COLUMN IF EXISTS "points_override_by";`);
    this.addSql(`ALTER TABLE "public"."competition_results" DROP COLUMN IF EXISTS "points_override_reason";`);
    this.addSql(`ALTER TABLE "public"."competition_results" DROP COLUMN IF EXISTS "points_manual_override";`);
  }
}
