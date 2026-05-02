import { Migration } from '@mikro-orm/migrations';

/**
 * Promotes the QA checklist from a hard-coded TypeScript constant to a true
 * database-backed master list, and tracks per-round customizations.
 *
 *   - `qa_master_items` holds the canonical checklist that future rounds
 *     pull from. Lazy-seeded from CHECKLIST_SECTIONS the first time it's
 *     accessed (so this migration creates an empty table — see QaService
 *     for the seed routine).
 *
 *   - `qa_checklist_items` gains two columns:
 *       * `is_custom`        — round-scoped item with no master ancestor.
 *       * `source_master_id` — link to the master item this row was copied
 *                              from (nullable for fully-custom items and
 *                              for legacy rows pre-migration).
 *
 *   Together these let admins:
 *     - Pick which master items go into a new round (subset selection)
 *     - Add custom items at round start or mid-round
 *     - Promote a custom item to the master so future rounds inherit it
 *     - Remove items from a round even after activation
 */
export class Migration20260502160000_qa_master_items extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."qa_master_items" (
        "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "section_id"          text        NOT NULL,
        "section_title"       text        NOT NULL,
        "section_description" text,
        "section_order"       integer     NOT NULL,
        "item_key"            text        NOT NULL,
        "item_title"          text        NOT NULL,
        "item_order"          integer     NOT NULL,
        "steps"               jsonb       NOT NULL DEFAULT '[]'::jsonb,
        "expected_result"     text        NOT NULL,
        "page_url"            text,
        "is_active"           boolean     NOT NULL DEFAULT true,
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        "updated_at"          timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("section_id", "item_key")
      );
    `);

    // Index for the common "list active master items grouped by section" query.
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_qa_master_items_section_order"
        ON "public"."qa_master_items" ("section_order", "item_order")
        WHERE "is_active" = true;
    `);

    this.addSql(`
      ALTER TABLE "public"."qa_checklist_items"
        ADD COLUMN IF NOT EXISTS "is_custom"        boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "source_master_id" uuid REFERENCES "public"."qa_master_items"(id) ON DELETE SET NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."qa_checklist_items"
        DROP COLUMN IF EXISTS "source_master_id",
        DROP COLUMN IF EXISTS "is_custom";
    `);
    this.addSql(`DROP INDEX IF EXISTS "public"."idx_qa_master_items_section_order";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."qa_master_items";`);
  }
}
