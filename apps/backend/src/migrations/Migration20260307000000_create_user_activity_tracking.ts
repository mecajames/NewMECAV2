import { Migration } from '@mikro-orm/migrations';

export class Migration20260307000000_create_user_activity_tracking extends Migration {
  async up(): Promise<void> {
    // Add last_seen_at column to profiles
    this.addSql(`ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ;`);

    // Partial index for efficient online-user queries
    this.addSql(`CREATE INDEX IF NOT EXISTS "profiles_last_seen_at_idx" ON "public"."profiles" ("last_seen_at") WHERE "last_seen_at" IS NOT NULL;`);

    // Create login_audit_log table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."login_audit_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" text NOT NULL,
        "user_id" uuid,
        "action" text NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "error_message" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "login_audit_log_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "login_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
      );
    `);

    // Indexes for common query patterns
    this.addSql(`CREATE INDEX IF NOT EXISTS "login_audit_log_user_id_idx" ON "public"."login_audit_log" ("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "login_audit_log_action_idx" ON "public"."login_audit_log" ("action");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "login_audit_log_created_at_idx" ON "public"."login_audit_log" ("created_at" DESC);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "login_audit_log_email_action_idx" ON "public"."login_audit_log" ("email", "action");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."login_audit_log";`);
    this.addSql(`ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "last_seen_at";`);
    this.addSql(`DROP INDEX IF EXISTS "profiles_last_seen_at_idx";`);
  }
}
