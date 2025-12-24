import { Migration } from '@mikro-orm/migrations';

export class Migration20251212000000_ticket_configuration extends Migration {
  async up(): Promise<void> {
    // 1. Create ticket_departments table
    this.addSql(`
      CREATE TABLE "ticket_departments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(50) NOT NULL,
        "description" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_private" boolean NOT NULL DEFAULT false,
        "is_default" boolean NOT NULL DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_departments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_departments_name_unique" UNIQUE ("name"),
        CONSTRAINT "ticket_departments_slug_unique" UNIQUE ("slug")
      );
    `);

    // 2. Create ticket_staff table
    this.addSql(`
      CREATE TABLE "ticket_staff" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "permission_level" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "can_be_assigned_tickets" boolean NOT NULL DEFAULT true,
        "receive_email_notifications" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_staff_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_staff_profile_id_unique" UNIQUE ("profile_id"),
        CONSTRAINT "ticket_staff_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE CASCADE
      );
    `);

    // 3. Create ticket_staff_departments junction table
    this.addSql(`
      CREATE TABLE "ticket_staff_departments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "staff_id" uuid NOT NULL,
        "department_id" uuid NOT NULL,
        "is_department_head" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_staff_departments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_staff_departments_staff_department_unique" UNIQUE ("staff_id", "department_id"),
        CONSTRAINT "ticket_staff_departments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ticket_staff" ("id") ON DELETE CASCADE,
        CONSTRAINT "ticket_staff_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "ticket_departments" ("id") ON DELETE CASCADE
      );
    `);

    // 4. Create ticket_routing_rules table
    this.addSql(`
      CREATE TABLE "ticket_routing_rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "description" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 0,
        "conditions" jsonb NOT NULL DEFAULT '{}',
        "assign_to_department_id" uuid NULL,
        "assign_to_staff_id" uuid NULL,
        "set_priority" varchar(20) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_routing_rules_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_routing_rules_department_fkey" FOREIGN KEY ("assign_to_department_id") REFERENCES "ticket_departments" ("id") ON DELETE SET NULL,
        CONSTRAINT "ticket_routing_rules_staff_fkey" FOREIGN KEY ("assign_to_staff_id") REFERENCES "ticket_staff" ("id") ON DELETE SET NULL
      );
    `);

    // 5. Create ticket_settings table
    this.addSql(`
      CREATE TABLE "ticket_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "setting_key" varchar(100) NOT NULL,
        "setting_value" text NOT NULL,
        "setting_type" varchar(20) NOT NULL DEFAULT 'string',
        "description" text NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_settings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_settings_key_unique" UNIQUE ("setting_key")
      );
    `);

    // 6. Seed default departments
    this.addSql(`
      INSERT INTO "ticket_departments" ("id", "name", "slug", "description", "is_default", "display_order") VALUES
        (gen_random_uuid(), 'General Support', 'general_support', 'General inquiries and support requests', true, 1),
        (gen_random_uuid(), 'Membership Services', 'membership_services', 'Membership questions, renewals, and account issues', false, 2),
        (gen_random_uuid(), 'Event Operations', 'event_operations', 'Event registration, scheduling, and competition questions', false, 3),
        (gen_random_uuid(), 'Technical Support', 'technical_support', 'Technical issues with the website or system', false, 4),
        (gen_random_uuid(), 'Billing', 'billing', 'Payment issues, refunds, and billing inquiries', false, 5),
        (gen_random_uuid(), 'Administration', 'administration', 'Administrative requests and official MECA business', false, 6);
    `);

    // 7. Seed default settings
    this.addSql(`
      INSERT INTO "ticket_settings" ("setting_key", "setting_value", "setting_type", "description") VALUES
        ('allow_user_department_selection', 'false', 'boolean', 'Allow users to select department when creating tickets'),
        ('allow_attachments', 'true', 'boolean', 'Allow file attachments on tickets'),
        ('max_attachment_size_mb', '10', 'number', 'Maximum attachment file size in MB'),
        ('require_category', 'true', 'boolean', 'Require category selection when creating tickets'),
        ('auto_close_resolved_days', '7', 'number', 'Days after which resolved tickets are automatically closed'),
        ('enable_email_notifications', 'false', 'boolean', 'Enable email notifications for ticket updates');
    `);

    // 8. Add department_id column to tickets table (nullable for now)
    this.addSql(`
      ALTER TABLE "tickets" ADD COLUMN "department_id" uuid NULL;
    `);

    // 9. Add foreign key constraint
    this.addSql(`
      ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_fkey"
        FOREIGN KEY ("department_id") REFERENCES "ticket_departments" ("id") ON DELETE SET NULL;
    `);

    // 10. Migrate existing department enum values to department_id
    this.addSql(`
      UPDATE "tickets" t
      SET "department_id" = d."id"
      FROM "ticket_departments" d
      WHERE t."department" = d."slug";
    `);

    // 11. Create indexes for performance
    this.addSql(`CREATE INDEX "ticket_staff_profile_id_idx" ON "ticket_staff" ("profile_id");`);
    this.addSql(`CREATE INDEX "ticket_staff_departments_staff_id_idx" ON "ticket_staff_departments" ("staff_id");`);
    this.addSql(`CREATE INDEX "ticket_staff_departments_department_id_idx" ON "ticket_staff_departments" ("department_id");`);
    this.addSql(`CREATE INDEX "ticket_routing_rules_priority_idx" ON "ticket_routing_rules" ("priority" DESC);`);
    this.addSql(`CREATE INDEX "ticket_routing_rules_active_idx" ON "ticket_routing_rules" ("is_active");`);
    this.addSql(`CREATE INDEX "tickets_department_id_idx" ON "tickets" ("department_id");`);

    // 12. Enable RLS on new tables
    this.addSql(`ALTER TABLE "ticket_departments" ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE "ticket_staff" ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE "ticket_staff_departments" ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE "ticket_routing_rules" ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE "ticket_settings" ENABLE ROW LEVEL SECURITY;`);

    // 13. RLS policies - allow authenticated users to read departments
    this.addSql(`
      CREATE POLICY "ticket_departments_select_policy" ON "ticket_departments"
        FOR SELECT TO authenticated USING (true);
    `);

    // 14. RLS policies - allow service role full access
    this.addSql(`
      CREATE POLICY "ticket_departments_service_policy" ON "ticket_departments"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "ticket_staff_service_policy" ON "ticket_staff"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "ticket_staff_departments_service_policy" ON "ticket_staff_departments"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "ticket_routing_rules_service_policy" ON "ticket_routing_rules"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "ticket_settings_service_policy" ON "ticket_settings"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
  }

  async down(): Promise<void> {
    // Drop RLS policies
    this.addSql(`DROP POLICY IF EXISTS "ticket_departments_select_policy" ON "ticket_departments";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_departments_service_policy" ON "ticket_departments";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_staff_service_policy" ON "ticket_staff";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_staff_departments_service_policy" ON "ticket_staff_departments";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_routing_rules_service_policy" ON "ticket_routing_rules";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_settings_service_policy" ON "ticket_settings";`);

    // Drop indexes
    this.addSql(`DROP INDEX IF EXISTS "ticket_staff_profile_id_idx";`);
    this.addSql(`DROP INDEX IF EXISTS "ticket_staff_departments_staff_id_idx";`);
    this.addSql(`DROP INDEX IF EXISTS "ticket_staff_departments_department_id_idx";`);
    this.addSql(`DROP INDEX IF EXISTS "ticket_routing_rules_priority_idx";`);
    this.addSql(`DROP INDEX IF EXISTS "ticket_routing_rules_active_idx";`);
    this.addSql(`DROP INDEX IF EXISTS "tickets_department_id_idx";`);

    // Remove department_id from tickets
    this.addSql(`ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_department_id_fkey";`);
    this.addSql(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "department_id";`);

    // Drop tables in reverse order
    this.addSql(`DROP TABLE IF EXISTS "ticket_settings";`);
    this.addSql(`DROP TABLE IF EXISTS "ticket_routing_rules";`);
    this.addSql(`DROP TABLE IF EXISTS "ticket_staff_departments";`);
    this.addSql(`DROP TABLE IF EXISTS "ticket_staff";`);
    this.addSql(`DROP TABLE IF EXISTS "ticket_departments";`);
  }
}
