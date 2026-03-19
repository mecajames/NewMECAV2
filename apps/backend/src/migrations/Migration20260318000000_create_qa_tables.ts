import { Migration } from '@mikro-orm/migrations';

export class Migration20260318000000_create_qa_tables extends Migration {
  async up(): Promise<void> {
    // 1. QA Rounds
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."qa_rounds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "version_number" integer NOT NULL DEFAULT 1,
        "title" text NOT NULL,
        "description" text,
        "status" text NOT NULL DEFAULT 'draft',
        "parent_round_id" uuid,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "qa_rounds_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "qa_rounds_parent_round_id_fkey" FOREIGN KEY ("parent_round_id") REFERENCES "public"."qa_rounds"("id") ON DELETE SET NULL,
        CONSTRAINT "qa_rounds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_rounds_status_idx" ON "public"."qa_rounds" ("status");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_rounds_created_at_idx" ON "public"."qa_rounds" ("created_at" DESC);`);

    // 2. QA Round Assignments
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."qa_round_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "round_id" uuid NOT NULL,
        "assigned_to" uuid NOT NULL,
        "assigned_by" uuid NOT NULL,
        "status" text NOT NULL DEFAULT 'assigned',
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        "started_at" timestamptz,
        "completed_at" timestamptz,
        CONSTRAINT "qa_round_assignments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "qa_round_assignments_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."qa_rounds"("id") ON DELETE CASCADE,
        CONSTRAINT "qa_round_assignments_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "qa_round_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
        CONSTRAINT "qa_round_assignments_unique" UNIQUE ("round_id", "assigned_to")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_round_assignments_round_id_idx" ON "public"."qa_round_assignments" ("round_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_round_assignments_assigned_to_idx" ON "public"."qa_round_assignments" ("assigned_to");`);

    // 3. QA Checklist Items
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."qa_checklist_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "round_id" uuid NOT NULL,
        "section_id" text NOT NULL,
        "section_title" text NOT NULL,
        "section_description" text,
        "section_order" integer NOT NULL,
        "item_key" text NOT NULL,
        "item_title" text NOT NULL,
        "item_order" integer NOT NULL,
        "steps" jsonb NOT NULL DEFAULT '[]',
        "expected_result" text NOT NULL,
        "page_url" text,
        "source_item_id" uuid,
        CONSTRAINT "qa_checklist_items_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "qa_checklist_items_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."qa_rounds"("id") ON DELETE CASCADE,
        CONSTRAINT "qa_checklist_items_source_item_id_fkey" FOREIGN KEY ("source_item_id") REFERENCES "public"."qa_checklist_items"("id") ON DELETE SET NULL
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_checklist_items_round_id_idx" ON "public"."qa_checklist_items" ("round_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_checklist_items_ordering_idx" ON "public"."qa_checklist_items" ("round_id", "section_order", "item_order");`);

    // 4. QA Item Responses
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."qa_item_responses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "item_id" uuid NOT NULL,
        "assignment_id" uuid NOT NULL,
        "reviewer_id" uuid NOT NULL,
        "status" text NOT NULL DEFAULT 'not_started',
        "comment" text,
        "page_url" text,
        "screenshot_url" text,
        "responded_at" timestamptz,
        CONSTRAINT "qa_item_responses_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "qa_item_responses_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."qa_checklist_items"("id") ON DELETE CASCADE,
        CONSTRAINT "qa_item_responses_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."qa_round_assignments"("id") ON DELETE CASCADE,
        CONSTRAINT "qa_item_responses_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "qa_item_responses_unique" UNIQUE ("item_id", "assignment_id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_item_responses_item_id_idx" ON "public"."qa_item_responses" ("item_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_item_responses_assignment_id_idx" ON "public"."qa_item_responses" ("assignment_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_item_responses_status_idx" ON "public"."qa_item_responses" ("status");`);

    // 5. QA Developer Fixes
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."qa_developer_fixes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "response_id" uuid NOT NULL,
        "developer_id" uuid NOT NULL,
        "fix_notes" text NOT NULL,
        "status" text NOT NULL DEFAULT 'in_progress',
        "fixed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "qa_developer_fixes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "qa_developer_fixes_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."qa_item_responses"("id") ON DELETE CASCADE,
        CONSTRAINT "qa_developer_fixes_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_developer_fixes_response_id_idx" ON "public"."qa_developer_fixes" ("response_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "qa_developer_fixes_status_idx" ON "public"."qa_developer_fixes" ("status");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."qa_developer_fixes";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."qa_item_responses";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."qa_checklist_items";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."qa_round_assignments";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."qa_rounds";`);
  }
}
