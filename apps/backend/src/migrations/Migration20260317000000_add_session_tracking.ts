import { Migration } from '@mikro-orm/migrations';

export class Migration20260317000000_add_session_tracking extends Migration {
  async up(): Promise<void> {
    // Add session_id column (nullable UUID) to login_audit_log
    this.addSql(`ALTER TABLE "public"."login_audit_log" ADD COLUMN IF NOT EXISTS "session_id" uuid;`);

    // Add logout_reason column (nullable text) to login_audit_log
    this.addSql(`ALTER TABLE "public"."login_audit_log" ADD COLUMN IF NOT EXISTS "logout_reason" text;`);

    // Partial index on session_id for efficient session pairing queries
    this.addSql(`CREATE INDEX IF NOT EXISTS "login_audit_log_session_id_idx" ON "public"."login_audit_log" ("session_id") WHERE "session_id" IS NOT NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "login_audit_log_session_id_idx";`);
    this.addSql(`ALTER TABLE "public"."login_audit_log" DROP COLUMN IF EXISTS "logout_reason";`);
    this.addSql(`ALTER TABLE "public"."login_audit_log" DROP COLUMN IF EXISTS "session_id";`);
  }
}
