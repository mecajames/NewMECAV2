import { Migration } from '@mikro-orm/migrations';

export class Migration20260514200100_add_competition_result_grace_fields extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_results"
      ADD COLUMN IF NOT EXISTS "original_meca_id" text,
      ADD COLUMN IF NOT EXISTS "pending_back_fill" boolean NOT NULL DEFAULT false;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "competition_results_pending_back_fill_idx"
      ON "public"."competition_results" ("original_meca_id")
      WHERE "pending_back_fill" = true;`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "public"."competition_results_pending_back_fill_idx";`);
    this.addSql(`ALTER TABLE "public"."competition_results"
      DROP COLUMN IF EXISTS "pending_back_fill",
      DROP COLUMN IF EXISTS "original_meca_id";`);
  }
}
