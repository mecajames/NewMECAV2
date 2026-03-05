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

    // Drop old RLS policies on voting_items (only if table exists)
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voting_items' AND table_schema = 'public') THEN
          EXECUTE 'DROP POLICY IF EXISTS "voting_items_select_policy" ON "voting_items"';
          EXECUTE 'DROP POLICY IF EXISTS "voting_items_insert_policy" ON "voting_items"';
          EXECUTE 'DROP POLICY IF EXISTS "voting_items_update_policy" ON "voting_items"';
          EXECUTE 'DROP POLICY IF EXISTS "voting_items_delete_policy" ON "voting_items"';
          DROP INDEX IF EXISTS "idx_voting_items_category";
          ALTER TABLE "voting_items" RENAME TO "voting_questions";
        END IF;
      END $$;
    `);

    // Rename name → title (only if old column exists)
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voting_questions' AND column_name = 'name') THEN
          ALTER TABLE "voting_questions" RENAME COLUMN "name" TO "title";
        END IF;
      END $$;
    `);

    // Add answer_type column (only if it doesn't exist yet)
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voting_questions' AND column_name = 'answer_type') THEN
          ALTER TABLE "voting_questions" ADD COLUMN "answer_type" voting_answer_type NOT NULL DEFAULT 'member_select';
        END IF;
      END $$;
    `);

    // Recreate index
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_questions_category" ON "voting_questions"("category_id");');

    // Recreate RLS policies on voting_questions
    this.addSql('ALTER TABLE "voting_questions" ENABLE ROW LEVEL SECURITY;');
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'voting_questions_select_policy' AND tablename = 'voting_questions') THEN
          CREATE POLICY "voting_questions_select_policy" ON "voting_questions"
            FOR SELECT USING (
              EXISTS (
                SELECT 1 FROM voting_categories vc
                JOIN voting_sessions vs ON vs.id = vc.session_id
                WHERE vc.id = category_id
                AND (vs.status IN ('open', 'closed', 'finalized') OR rls_is_admin())
              )
            );
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'voting_questions_insert_policy' AND tablename = 'voting_questions') THEN
          CREATE POLICY "voting_questions_insert_policy" ON "voting_questions"
            FOR INSERT WITH CHECK (rls_is_admin());
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'voting_questions_update_policy' AND tablename = 'voting_questions') THEN
          CREATE POLICY "voting_questions_update_policy" ON "voting_questions"
            FOR UPDATE USING (rls_is_admin());
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'voting_questions_delete_policy' AND tablename = 'voting_questions') THEN
          CREATE POLICY "voting_questions_delete_policy" ON "voting_questions"
            FOR DELETE USING (rls_is_admin());
        END IF;
      END $$;
    `);

    // =========================================================================
    // 3. Transform voting_ballots → voting_responses
    // =========================================================================

    // Drop old RLS policies on voting_ballots and rename to voting_responses (only if table exists)
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voting_ballots' AND table_schema = 'public') THEN
          EXECUTE 'DROP POLICY IF EXISTS "voting_ballots_select_policy" ON "voting_ballots"';
          EXECUTE 'DROP POLICY IF EXISTS "voting_ballots_insert_policy" ON "voting_ballots"';
          DROP INDEX IF EXISTS "idx_voting_ballots_session";
          DROP INDEX IF EXISTS "idx_voting_ballots_voter";
          DROP INDEX IF EXISTS "idx_voting_ballots_item";
          ALTER TABLE "voting_ballots" DROP CONSTRAINT IF EXISTS "voting_ballots_session_id_category_id_voter_id_unique";
          ALTER TABLE "voting_ballots" RENAME TO "voting_responses";
        END IF;
      END $$;
    `);

    // Drop old columns (item_id, category_id)
    this.addSql('ALTER TABLE "voting_responses" DROP COLUMN IF EXISTS "item_id";');
    this.addSql('ALTER TABLE "voting_responses" DROP COLUMN IF EXISTS "category_id";');

    // Add new columns (only if they don't exist)
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voting_responses' AND column_name = 'question_id') THEN
          ALTER TABLE "voting_responses"
            ADD COLUMN "question_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            ADD COLUMN "selected_member_id" uuid,
            ADD COLUMN "text_answer" text;
          ALTER TABLE "voting_responses" ALTER COLUMN "question_id" DROP DEFAULT;
        END IF;
      END $$;
    `);

    // Add foreign keys (only if they don't exist)
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'voting_responses_question_id_fkey') THEN
          ALTER TABLE "voting_responses"
            ADD CONSTRAINT "voting_responses_question_id_fkey"
            FOREIGN KEY ("question_id") REFERENCES "voting_questions"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'voting_responses_selected_member_id_fkey') THEN
          ALTER TABLE "voting_responses"
            ADD CONSTRAINT "voting_responses_selected_member_id_fkey"
            FOREIGN KEY ("selected_member_id") REFERENCES "profiles"("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    // Add unique constraint (only if it doesn't exist)
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'voting_responses_session_question_voter_unique') THEN
          ALTER TABLE "voting_responses"
            ADD CONSTRAINT "voting_responses_session_question_voter_unique"
            UNIQUE ("session_id", "question_id", "voter_id");
        END IF;
      END $$;
    `);

    // Recreate indexes
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_responses_session" ON "voting_responses"("session_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_responses_voter" ON "voting_responses"("voter_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_responses_question" ON "voting_responses"("question_id");');

    // Recreate RLS policies on voting_responses
    this.addSql('ALTER TABLE "voting_responses" ENABLE ROW LEVEL SECURITY;');
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'voting_responses_select_policy' AND tablename = 'voting_responses') THEN
          CREATE POLICY "voting_responses_select_policy" ON "voting_responses"
            FOR SELECT USING (voter_id = auth.uid() OR rls_is_admin());
        END IF;
      END $$;
    `);
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'voting_responses_insert_policy' AND tablename = 'voting_responses') THEN
          CREATE POLICY "voting_responses_insert_policy" ON "voting_responses"
            FOR INSERT WITH CHECK (voter_id = auth.uid());
        END IF;
      END $$;
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
