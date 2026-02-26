import { Migration } from '@mikro-orm/migrations';

export class Migration20260220150000_redesign_voting_questions extends Migration {
  async up(): Promise<void> {
    // =========================================================================
    // 1. Create voting_answer_type enum
    // =========================================================================
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE voting_answer_type AS ENUM ('member_select', 'text');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // =========================================================================
    // 2. Transform voting_items → voting_questions
    // =========================================================================

    // Drop old RLS policies on voting_items
    this.addSql('DROP POLICY IF EXISTS "voting_items_select_policy" ON "voting_items";');
    this.addSql('DROP POLICY IF EXISTS "voting_items_insert_policy" ON "voting_items";');
    this.addSql('DROP POLICY IF EXISTS "voting_items_update_policy" ON "voting_items";');
    this.addSql('DROP POLICY IF EXISTS "voting_items_delete_policy" ON "voting_items";');

    // Drop old index
    this.addSql('DROP INDEX IF EXISTS "idx_voting_items_category";');

    // Rename table
    this.addSql('ALTER TABLE "voting_items" RENAME TO "voting_questions";');

    // Rename name → title
    this.addSql('ALTER TABLE "voting_questions" RENAME COLUMN "name" TO "title";');

    // Add answer_type column
    this.addSql(`
      ALTER TABLE "voting_questions"
        ADD COLUMN "answer_type" voting_answer_type NOT NULL DEFAULT 'member_select';
    `);

    // Recreate index
    this.addSql('CREATE INDEX "idx_voting_questions_category" ON "voting_questions"("category_id");');

    // Recreate RLS policies on voting_questions
    this.addSql('ALTER TABLE "voting_questions" ENABLE ROW LEVEL SECURITY;');
    this.addSql(`
      CREATE POLICY "voting_questions_select_policy" ON "voting_questions"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM voting_categories vc
            JOIN voting_sessions vs ON vs.id = vc.session_id
            WHERE vc.id = category_id
            AND (vs.status IN ('open', 'closed', 'finalized') OR rls_is_admin())
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "voting_questions_insert_policy" ON "voting_questions"
        FOR INSERT WITH CHECK (rls_is_admin());
    `);
    this.addSql(`
      CREATE POLICY "voting_questions_update_policy" ON "voting_questions"
        FOR UPDATE USING (rls_is_admin());
    `);
    this.addSql(`
      CREATE POLICY "voting_questions_delete_policy" ON "voting_questions"
        FOR DELETE USING (rls_is_admin());
    `);

    // =========================================================================
    // 3. Transform voting_ballots → voting_responses
    // =========================================================================

    // Drop old RLS policies on voting_ballots
    this.addSql('DROP POLICY IF EXISTS "voting_ballots_select_policy" ON "voting_ballots";');
    this.addSql('DROP POLICY IF EXISTS "voting_ballots_insert_policy" ON "voting_ballots";');

    // Drop old indexes
    this.addSql('DROP INDEX IF EXISTS "idx_voting_ballots_session";');
    this.addSql('DROP INDEX IF EXISTS "idx_voting_ballots_voter";');
    this.addSql('DROP INDEX IF EXISTS "idx_voting_ballots_item";');

    // Drop old unique constraint
    this.addSql('ALTER TABLE "voting_ballots" DROP CONSTRAINT IF EXISTS "voting_ballots_session_id_category_id_voter_id_unique";');

    // Rename table
    this.addSql('ALTER TABLE "voting_ballots" RENAME TO "voting_responses";');

    // Drop old columns (item_id, category_id)
    this.addSql('ALTER TABLE "voting_responses" DROP COLUMN IF EXISTS "item_id";');
    this.addSql('ALTER TABLE "voting_responses" DROP COLUMN IF EXISTS "category_id";');

    // Add new columns
    this.addSql(`
      ALTER TABLE "voting_responses"
        ADD COLUMN "question_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        ADD COLUMN "selected_member_id" uuid,
        ADD COLUMN "text_answer" text;
    `);

    // Remove the default (it was just to allow adding NOT NULL to existing rows)
    this.addSql('ALTER TABLE "voting_responses" ALTER COLUMN "question_id" DROP DEFAULT;');

    // Add foreign keys
    this.addSql(`
      ALTER TABLE "voting_responses"
        ADD CONSTRAINT "voting_responses_question_id_fkey"
        FOREIGN KEY ("question_id") REFERENCES "voting_questions"("id") ON DELETE RESTRICT;
    `);
    this.addSql(`
      ALTER TABLE "voting_responses"
        ADD CONSTRAINT "voting_responses_selected_member_id_fkey"
        FOREIGN KEY ("selected_member_id") REFERENCES "profiles"("id") ON DELETE RESTRICT;
    `);

    // Add unique constraint (one response per question per voter per session)
    this.addSql(`
      ALTER TABLE "voting_responses"
        ADD CONSTRAINT "voting_responses_session_question_voter_unique"
        UNIQUE ("session_id", "question_id", "voter_id");
    `);

    // Recreate indexes
    this.addSql('CREATE INDEX "idx_voting_responses_session" ON "voting_responses"("session_id");');
    this.addSql('CREATE INDEX "idx_voting_responses_voter" ON "voting_responses"("voter_id");');
    this.addSql('CREATE INDEX "idx_voting_responses_question" ON "voting_responses"("question_id");');

    // Recreate RLS policies on voting_responses
    this.addSql('ALTER TABLE "voting_responses" ENABLE ROW LEVEL SECURITY;');
    this.addSql(`
      CREATE POLICY "voting_responses_select_policy" ON "voting_responses"
        FOR SELECT USING (
          voter_id = auth.uid() OR rls_is_admin()
        );
    `);
    this.addSql(`
      CREATE POLICY "voting_responses_insert_policy" ON "voting_responses"
        FOR INSERT WITH CHECK (
          voter_id = auth.uid()
        );
    `);
  }

  async down(): Promise<void> {
    // Drop new RLS policies
    this.addSql('DROP POLICY IF EXISTS "voting_responses_insert_policy" ON "voting_responses";');
    this.addSql('DROP POLICY IF EXISTS "voting_responses_select_policy" ON "voting_responses";');

    // Drop new indexes
    this.addSql('DROP INDEX IF EXISTS "idx_voting_responses_session";');
    this.addSql('DROP INDEX IF EXISTS "idx_voting_responses_voter";');
    this.addSql('DROP INDEX IF EXISTS "idx_voting_responses_question";');

    // Drop new constraint
    this.addSql('ALTER TABLE "voting_responses" DROP CONSTRAINT IF EXISTS "voting_responses_session_question_voter_unique";');

    // Drop foreign keys
    this.addSql('ALTER TABLE "voting_responses" DROP CONSTRAINT IF EXISTS "voting_responses_selected_member_id_fkey";');
    this.addSql('ALTER TABLE "voting_responses" DROP CONSTRAINT IF EXISTS "voting_responses_question_id_fkey";');

    // Drop new columns, add back old
    this.addSql('ALTER TABLE "voting_responses" DROP COLUMN IF EXISTS "question_id";');
    this.addSql('ALTER TABLE "voting_responses" DROP COLUMN IF EXISTS "selected_member_id";');
    this.addSql('ALTER TABLE "voting_responses" DROP COLUMN IF EXISTS "text_answer";');
    this.addSql('ALTER TABLE "voting_responses" ADD COLUMN "category_id" uuid;');
    this.addSql('ALTER TABLE "voting_responses" ADD COLUMN "item_id" uuid;');

    // Rename back
    this.addSql('ALTER TABLE "voting_responses" RENAME TO "voting_ballots";');

    // Restore old constraint
    this.addSql('ALTER TABLE "voting_ballots" ADD CONSTRAINT "voting_ballots_session_id_category_id_voter_id_unique" UNIQUE ("session_id", "category_id", "voter_id");');

    // Restore old indexes
    this.addSql('CREATE INDEX "idx_voting_ballots_session" ON "voting_ballots"("session_id");');
    this.addSql('CREATE INDEX "idx_voting_ballots_voter" ON "voting_ballots"("voter_id");');
    this.addSql('CREATE INDEX "idx_voting_ballots_item" ON "voting_ballots"("item_id");');

    // Drop new RLS on questions
    this.addSql('DROP POLICY IF EXISTS "voting_questions_delete_policy" ON "voting_questions";');
    this.addSql('DROP POLICY IF EXISTS "voting_questions_update_policy" ON "voting_questions";');
    this.addSql('DROP POLICY IF EXISTS "voting_questions_insert_policy" ON "voting_questions";');
    this.addSql('DROP POLICY IF EXISTS "voting_questions_select_policy" ON "voting_questions";');

    // Drop index
    this.addSql('DROP INDEX IF EXISTS "idx_voting_questions_category";');

    // Drop answer_type column
    this.addSql('ALTER TABLE "voting_questions" DROP COLUMN IF EXISTS "answer_type";');

    // Rename back
    this.addSql('ALTER TABLE "voting_questions" RENAME COLUMN "title" TO "name";');
    this.addSql('ALTER TABLE "voting_questions" RENAME TO "voting_items";');

    // Recreate old index
    this.addSql('CREATE INDEX "idx_voting_items_category" ON "voting_items"("category_id");');

    // Drop enum
    this.addSql('DROP TYPE IF EXISTS voting_answer_type CASCADE;');
  }
}
