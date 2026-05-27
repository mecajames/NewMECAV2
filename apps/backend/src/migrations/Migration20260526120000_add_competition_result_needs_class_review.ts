import { Migration } from '@mikro-orm/migrations';

export class Migration20260526120000_add_competition_result_needs_class_review extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_results"
      ADD COLUMN IF NOT EXISTS "needs_class_review" boolean NOT NULL DEFAULT false;`);
    // Partial index powers the admin "Pending Results" queue lookup
    // (WHERE needs_class_review = true), which is a tiny slice of the table.
    this.addSql(`CREATE INDEX IF NOT EXISTS "competition_results_needs_class_review_idx"
      ON "public"."competition_results" ("created_at")
      WHERE "needs_class_review" = true;`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "public"."competition_results_needs_class_review_idx";`);
    this.addSql(`ALTER TABLE "public"."competition_results"
      DROP COLUMN IF EXISTS "needs_class_review";`);
  }
}
