import { Migration } from '@mikro-orm/migrations';

export class Migration20260101100000_create_contact_submissions extends Migration {
  async up(): Promise<void> {
    // Create contact_status enum
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE "contact_status" AS ENUM ('pending', 'read', 'replied', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create contact_submissions table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "contact_submissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "email" varchar(255) NOT NULL,
        "subject" varchar(200) NOT NULL,
        "message" text NOT NULL,
        "status" contact_status NOT NULL DEFAULT 'pending',
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "replied_at" timestamptz,
        "replied_by" uuid,
        "admin_notes" text,
        CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "contact_submissions_replied_by_fkey" FOREIGN KEY ("replied_by") REFERENCES "profiles"("id") ON DELETE SET NULL
      );
    `);

    // Create indexes
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_contact_submissions_status" ON "contact_submissions" ("status");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_contact_submissions_created_at" ON "contact_submissions" ("created_at");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_contact_submissions_email" ON "contact_submissions" ("email");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "contact_submissions";`);
    this.addSql(`DROP TYPE IF EXISTS "contact_status";`);
  }
}
