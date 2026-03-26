import { Migration } from '@mikro-orm/migrations';

export class Migration20260325100000_use_existing_events extends Migration {
  override async up(): Promise<void> {
    // Drop FK constraints from world_finals_events
    this.addSql(`ALTER TABLE "public"."world_finals_packages" DROP CONSTRAINT IF EXISTS "world_finals_packages_wf_event_id_fkey";`);
    this.addSql(`ALTER TABLE "public"."world_finals_addon_items" DROP CONSTRAINT IF EXISTS "world_finals_addon_items_wf_event_id_fkey";`);

    // Reset wf_event_id to NULL (old IDs reference world_finals_events, not events)
    this.addSql(`UPDATE "public"."world_finals_packages" SET wf_event_id = NULL;`);
    this.addSql(`UPDATE "public"."world_finals_addon_items" SET wf_event_id = NULL;`);
    this.addSql(`UPDATE "public"."finals_registrations" SET wf_event_id = NULL;`);

    // Drop world_finals_events table
    this.addSql(`DROP TABLE IF EXISTS "public"."world_finals_events";`);

    // wf_event_id columns now reference the events table (no FK constraint needed — soft reference)
  }

  override async down(): Promise<void> {
    // Re-create world_finals_events table (from Migration20260325000000)
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
  }
}
