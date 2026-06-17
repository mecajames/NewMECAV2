import { Migration } from '@mikro-orm/migrations';

/**
 * Configurable, per-category support form. Two tables:
 *  - ticket_custom_fields: admin-defined field definitions, each bound to one
 *    or more ticket categories (shown when that category is selected).
 *  - ticket_custom_field_answers: a submitter's answers, keyed (ticket, field).
 *
 * Seeds a "Related Event" event_reference field (required) for the event /
 * competition categories so that behaviour works out of the box; admins can
 * adjust it in the Custom Fields admin UI.
 */
export class Migration20260616090000_ticket_custom_fields extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."ticket_custom_fields" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "field_key" text NOT NULL,
        "label" text NOT NULL,
        "field_type" text NOT NULL,
        "help_text" text NULL,
        "options" jsonb NULL,
        "categories" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "required" boolean NOT NULL DEFAULT false,
        "visible_to_user" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_custom_fields_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_custom_fields_field_key_unique" UNIQUE ("field_key")
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."ticket_custom_field_answers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL,
        "field_id" uuid NOT NULL,
        "value" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_custom_field_answers_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "tcfa_ticket_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets" ("id") ON DELETE CASCADE,
        CONSTRAINT "tcfa_field_fk" FOREIGN KEY ("field_id") REFERENCES "public"."ticket_custom_fields" ("id") ON DELETE CASCADE
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "tcfa_ticket_idx" ON "public"."ticket_custom_field_answers" ("ticket_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "tcfa_field_idx" ON "public"."ticket_custom_field_answers" ("field_id");`);

    // Seed: "Related Event" required for the event / competition categories.
    this.addSql(`
      INSERT INTO "public"."ticket_custom_fields"
        ("id", "field_key", "label", "field_type", "help_text", "options", "categories", "required", "visible_to_user", "display_order", "is_active")
      VALUES (
        gen_random_uuid(), 'related_event', 'Related Event', 'event_reference',
        'Select the event your request is about.', NULL,
        '["event_registration","competition_results","event_hosting"]'::jsonb,
        true, true, 10, true
      )
      ON CONFLICT ("field_key") DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."ticket_custom_field_answers";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."ticket_custom_fields";`);
  }
}
