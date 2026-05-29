import { Migration } from '@mikro-orm/migrations';

/**
 * Ticket workflow enhancements migration:
 *
 *   1. saved_ticket_filters — per-agent server-backed filter presets
 *      (replaces the per-browser localStorage approach). Optionally
 *      shareable team-wide via is_shared_with_team flag.
 *
 *   2. ticket_canned_responses — per-agent reply templates. Variables
 *      ({{customer_name}}, {{ticket_id}}, etc.) are resolved client-side
 *      at insert time. is_shared exposes a response to all staff.
 *
 *   3. staff_signatures — per-agent rich-text signature appended to
 *      outbound ticket reply emails (after body, before MECA footer).
 *      One row per profile.
 *
 *   4. profiles columns — none added; signature lives in its own table
 *      to keep profiles narrow.
 *
 * All three tables have RLS enabled but no policies — the API guards
 * access via SupabaseAdminService server-side auth. Direct PostgREST
 * is intentionally locked out, matching the pattern used by
 * tickets / ticket_comments.
 */
export class Migration20260529120000_ticket_workflow_enhancements extends Migration {
  override async up(): Promise<void> {
    // ---------------------------------------------------------------
    // 1. saved_ticket_filters
    // ---------------------------------------------------------------
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."saved_ticket_filters" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" text NOT NULL,
        "criteria" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "is_default" boolean NOT NULL DEFAULT false,
        "is_shared_with_team" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "saved_ticket_filters_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "saved_ticket_filters_name_length" CHECK (char_length("name") BETWEEN 1 AND 60),
        CONSTRAINT "saved_ticket_filters_user_fkey"
          FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "saved_ticket_filters_user_name_unique"
          UNIQUE ("user_id", "name")
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "saved_ticket_filters_user_idx"
        ON "public"."saved_ticket_filters" ("user_id", "sort_order");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "saved_ticket_filters_shared_idx"
        ON "public"."saved_ticket_filters" ("is_shared_with_team")
        WHERE "is_shared_with_team" = true;
    `);
    // Only one row per user may be is_default = true. Enforced via
    // partial unique index so application code can be a single UPDATE
    // (set to true) followed by a guard rather than a transaction.
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "saved_ticket_filters_one_default_per_user"
        ON "public"."saved_ticket_filters" ("user_id")
        WHERE "is_default" = true;
    `);
    this.addSql(`ALTER TABLE "public"."saved_ticket_filters" ENABLE ROW LEVEL SECURITY;`);

    // ---------------------------------------------------------------
    // 2. ticket_canned_responses
    // ---------------------------------------------------------------
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."ticket_canned_responses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "category" text,
        "is_shared" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_canned_responses_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_canned_responses_title_length"
          CHECK (char_length("title") BETWEEN 1 AND 120),
        CONSTRAINT "ticket_canned_responses_body_length"
          CHECK (char_length("body") BETWEEN 1 AND 20000),
        CONSTRAINT "ticket_canned_responses_user_fkey"
          FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "ticket_canned_responses_user_idx"
        ON "public"."ticket_canned_responses" ("user_id", "sort_order");
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "ticket_canned_responses_shared_idx"
        ON "public"."ticket_canned_responses" ("is_shared")
        WHERE "is_shared" = true;
    `);
    this.addSql(`ALTER TABLE "public"."ticket_canned_responses" ENABLE ROW LEVEL SECURITY;`);

    // ---------------------------------------------------------------
    // 3. staff_signatures
    // ---------------------------------------------------------------
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."staff_signatures" (
        "user_id" uuid NOT NULL,
        "html" text NOT NULL DEFAULT '',
        "plain_text" text NOT NULL DEFAULT '',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "staff_signatures_pkey" PRIMARY KEY ("user_id"),
        CONSTRAINT "staff_signatures_html_length"
          CHECK (char_length("html") <= 20000),
        CONSTRAINT "staff_signatures_user_fkey"
          FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
      );
    `);
    this.addSql(`ALTER TABLE "public"."staff_signatures" ENABLE ROW LEVEL SECURITY;`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."staff_signatures";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."ticket_canned_responses";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."saved_ticket_filters";`);
  }
}
