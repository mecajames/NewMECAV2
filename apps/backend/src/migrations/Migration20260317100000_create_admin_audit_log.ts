import { Migration } from '@mikro-orm/migrations';

export class Migration20260317100000_create_admin_audit_log extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "admin_user_id" uuid NOT NULL,
        "action" text NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" uuid,
        "description" text,
        "old_values" jsonb,
        "new_values" jsonb,
        "ip_address" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "admin_audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "admin_audit_log_admin_user_id_idx" ON "public"."admin_audit_log" ("admin_user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "admin_audit_log_resource_type_idx" ON "public"."admin_audit_log" ("resource_type");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "admin_audit_log_created_at_idx" ON "public"."admin_audit_log" ("created_at" DESC);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "admin_audit_log_action_idx" ON "public"."admin_audit_log" ("action");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."admin_audit_log";`);
  }
}
