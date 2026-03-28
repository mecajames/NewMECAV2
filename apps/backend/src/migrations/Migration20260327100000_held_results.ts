import { Migration } from '@mikro-orm/migrations';

export class Migration20260327100000_held_results extends Migration {
  override async up(): Promise<void> {
    // Add flag to hold results for expired members during grace period
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "points_held_for_renewal" boolean NOT NULL DEFAULT false;`);
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "held_at" timestamptz;`);
    this.addSql(`ALTER TABLE "public"."competition_results" ADD COLUMN IF NOT EXISTS "released_at" timestamptz;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_results" DROP COLUMN IF EXISTS "points_held_for_renewal";`);
    this.addSql(`ALTER TABLE "public"."competition_results" DROP COLUMN IF EXISTS "held_at";`);
    this.addSql(`ALTER TABLE "public"."competition_results" DROP COLUMN IF EXISTS "released_at";`);
  }
}
