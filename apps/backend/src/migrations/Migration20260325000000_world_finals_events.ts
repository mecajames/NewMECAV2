import { Migration } from '@mikro-orm/migrations';

export class Migration20260325000000_world_finals_events extends Migration {
  override async up(): Promise<void> {
    // Step 1: Create world_finals_events table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."world_finals_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "season_id" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "event_date" timestamptz,
        "event_end_date" timestamptz,
        "venue_name" text,
        "address" text,
        "city" text,
        "state" text,
        "registration_open_date" timestamptz NOT NULL DEFAULT now(),
        "early_bird_deadline" timestamptz NOT NULL DEFAULT now(),
        "registration_close_date" timestamptz NOT NULL DEFAULT now(),
        "formats" jsonb NOT NULL DEFAULT '[]',
        "event_group" text,
        "custom_message" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "world_finals_events_pkey" PRIMARY KEY ("id")
      );
    `);

    // Step 2: Add wf_event_id columns
    this.addSql(`ALTER TABLE "public"."world_finals_packages" ADD COLUMN IF NOT EXISTS "wf_event_id" uuid;`);
    this.addSql(`ALTER TABLE "public"."world_finals_addon_items" ADD COLUMN IF NOT EXISTS "wf_event_id" uuid;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "wf_event_id" uuid;`);

    // Step 3: Create default events from existing registration configs
    this.addSql(`
      INSERT INTO "public"."world_finals_events" (id, season_id, name, registration_open_date, early_bird_deadline, registration_close_date, is_active, custom_message)
      SELECT gen_random_uuid(), c.season_id, 'MECA World Finals',
             c.registration_open_date, c.early_bird_deadline, c.registration_close_date, c.is_active, c.custom_message
      FROM "public"."world_finals_registration_config" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "public"."world_finals_events" e WHERE e.season_id = c.season_id
      );
    `);

    // Step 4: Backfill wf_event_id on existing packages
    this.addSql(`
      UPDATE "public"."world_finals_packages" p
      SET wf_event_id = e.id
      FROM "public"."world_finals_events" e
      WHERE p.season_id = e.season_id AND p.wf_event_id IS NULL;
    `);

    // Step 5: Backfill wf_event_id on existing addon items
    this.addSql(`
      UPDATE "public"."world_finals_addon_items" a
      SET wf_event_id = e.id
      FROM "public"."world_finals_events" e
      WHERE a.season_id = e.season_id AND a.wf_event_id IS NULL;
    `);

    // Step 6: Backfill wf_event_id on existing registrations
    this.addSql(`
      UPDATE "public"."finals_registrations" r
      SET wf_event_id = e.id
      FROM "public"."world_finals_events" e
      WHERE r.season_id = e.season_id AND r.wf_event_id IS NULL;
    `);

    // Step 7: Add FK constraints
    this.addSql(`
      ALTER TABLE "public"."world_finals_packages"
      ADD CONSTRAINT "world_finals_packages_wf_event_id_fkey"
      FOREIGN KEY ("wf_event_id") REFERENCES "public"."world_finals_events"("id") ON DELETE SET NULL;
    `);

    this.addSql(`
      ALTER TABLE "public"."world_finals_addon_items"
      ADD CONSTRAINT "world_finals_addon_items_wf_event_id_fkey"
      FOREIGN KEY ("wf_event_id") REFERENCES "public"."world_finals_events"("id") ON DELETE SET NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."world_finals_packages" DROP CONSTRAINT IF EXISTS "world_finals_packages_wf_event_id_fkey";`);
    this.addSql(`ALTER TABLE "public"."world_finals_addon_items" DROP CONSTRAINT IF EXISTS "world_finals_addon_items_wf_event_id_fkey";`);
    this.addSql(`ALTER TABLE "public"."world_finals_packages" DROP COLUMN IF EXISTS "wf_event_id";`);
    this.addSql(`ALTER TABLE "public"."world_finals_addon_items" DROP COLUMN IF EXISTS "wf_event_id";`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" DROP COLUMN IF EXISTS "wf_event_id";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."world_finals_events";`);
  }
}
