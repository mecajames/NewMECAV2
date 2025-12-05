import { Migration } from '@mikro-orm/migrations';

export class Migration20251203000000_fix_audit_log_fk_constraint extends Migration {
  async up(): Promise<void> {
    // Drop the existing foreign key constraint if it exists
    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "public"."results_audit_log"
        DROP CONSTRAINT IF EXISTS "results_audit_log_result_id_foreign";
      EXCEPTION
        WHEN undefined_object THEN NULL;
      END $$;
    `);

    // Also try alternate constraint names that PostgreSQL might have generated
    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "public"."results_audit_log"
        DROP CONSTRAINT IF EXISTS "results_audit_log_result_id_fkey";
      EXCEPTION
        WHEN undefined_object THEN NULL;
      END $$;
    `);

    // Re-add the constraint with ON DELETE SET NULL (only if it doesn't exist)
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'results_audit_log_result_id_fkey'
        ) THEN
          ALTER TABLE "public"."results_audit_log"
          ADD CONSTRAINT "results_audit_log_result_id_fkey"
          FOREIGN KEY ("result_id")
          REFERENCES "public"."competition_results"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  async down(): Promise<void> {
    // Revert to the original constraint without ON DELETE SET NULL
    this.addSql(`
      ALTER TABLE "public"."results_audit_log"
      DROP CONSTRAINT IF EXISTS "results_audit_log_result_id_fkey";
    `);

    this.addSql(`
      ALTER TABLE "public"."results_audit_log"
      ADD CONSTRAINT "results_audit_log_result_id_fkey"
      FOREIGN KEY ("result_id")
      REFERENCES "public"."competition_results"("id");
    `);
  }
}
