import { Migration } from '@mikro-orm/migrations';

export class Migration20251203000000_fix_audit_log_fk_constraint extends Migration {
  async up(): Promise<void> {
    // Only run if the results_audit_log table exists
    this.addSql(`
      DO $$
      BEGIN
        -- Check if table exists before modifying
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'results_audit_log') THEN
          -- Drop existing constraints
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'results_audit_log_result_id_foreign') THEN
            ALTER TABLE "public"."results_audit_log" DROP CONSTRAINT "results_audit_log_result_id_foreign";
          END IF;

          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'results_audit_log_result_id_fkey') THEN
            ALTER TABLE "public"."results_audit_log" DROP CONSTRAINT "results_audit_log_result_id_fkey";
          END IF;

          -- Re-add the constraint with ON DELETE SET NULL
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
    // Only run if the results_audit_log table exists
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'results_audit_log') THEN
          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'results_audit_log_result_id_fkey') THEN
            ALTER TABLE "public"."results_audit_log" DROP CONSTRAINT "results_audit_log_result_id_fkey";
          END IF;

          ALTER TABLE "public"."results_audit_log"
          ADD CONSTRAINT "results_audit_log_result_id_fkey"
          FOREIGN KEY ("result_id")
          REFERENCES "public"."competition_results"("id");
        END IF;
      END $$;
    `);
  }
}
