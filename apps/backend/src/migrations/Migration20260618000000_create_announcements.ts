import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: creates the `announcements` table for site-wide announcement banners.
 * Touches no existing table or data.
 */
export class Migration20260618000000_create_announcements extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."announcements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" text NOT NULL,
        "body" text NOT NULL,
        "type" text NOT NULL DEFAULT 'info',
        "panel_color" text NULL,
        "text_color" text NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 0,
        "dismissible" boolean NOT NULL DEFAULT true,
        "audience" jsonb NOT NULL DEFAULT '{"everyone":true,"authenticated":false,"activeMembers":false,"staff":false,"roles":[],"memberIds":[]}'::jsonb,
        "created_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
      );
    `);

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "announcements_active_window_idx" ON "public"."announcements" ("is_active", "starts_at", "ends_at");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "announcements_priority_idx" ON "public"."announcements" ("priority");`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."announcements" CASCADE;`);
  }
}
