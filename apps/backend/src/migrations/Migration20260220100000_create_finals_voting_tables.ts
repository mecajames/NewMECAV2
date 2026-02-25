import { Migration } from '@mikro-orm/migrations';

export class Migration20260220100000_create_finals_voting_tables extends Migration {
  async up(): Promise<void> {
    // Create voting_session_status enum
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE voting_session_status AS ENUM ('draft', 'open', 'closed', 'finalized');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create voting_sessions table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "voting_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "season_id" uuid NOT NULL REFERENCES "seasons"("id") ON DELETE RESTRICT,
        "title" text NOT NULL,
        "description" text,
        "start_date" timestamptz NOT NULL,
        "end_date" timestamptz NOT NULL,
        "status" voting_session_status NOT NULL DEFAULT 'draft',
        "results_finalized_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create voting_categories table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "voting_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL REFERENCES "voting_sessions"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "description" text,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create voting_items table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "voting_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL REFERENCES "voting_categories"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "description" text,
        "image_url" text,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create voting_ballots table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "voting_ballots" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL REFERENCES "voting_sessions"("id") ON DELETE RESTRICT,
        "category_id" uuid NOT NULL REFERENCES "voting_categories"("id") ON DELETE RESTRICT,
        "item_id" uuid NOT NULL REFERENCES "voting_items"("id") ON DELETE RESTRICT,
        "voter_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE("session_id", "category_id", "voter_id")
      );
    `);

    // Indexes for voting_sessions
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_sessions_season" ON "voting_sessions"("season_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_sessions_status" ON "voting_sessions"("status");');

    // Indexes for voting_categories
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_categories_session" ON "voting_categories"("session_id");');

    // Indexes for voting_items
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_items_category" ON "voting_items"("category_id");');

    // Indexes for voting_ballots
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_ballots_session" ON "voting_ballots"("session_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_ballots_voter" ON "voting_ballots"("voter_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_ballots_item" ON "voting_ballots"("item_id");');

    // Enable RLS
    this.addSql('ALTER TABLE "voting_sessions" ENABLE ROW LEVEL SECURITY;');
    this.addSql('ALTER TABLE "voting_categories" ENABLE ROW LEVEL SECURITY;');
    this.addSql('ALTER TABLE "voting_items" ENABLE ROW LEVEL SECURITY;');
    this.addSql('ALTER TABLE "voting_ballots" ENABLE ROW LEVEL SECURITY;');

    // RLS policies for voting_sessions (admin write, authenticated read for open/finalized)
    this.addSql(`
      CREATE POLICY "voting_sessions_select_policy" ON "voting_sessions"
        FOR SELECT USING (
          status IN ('open', 'closed', 'finalized')
          OR rls_is_admin()
        );
    `);
    this.addSql(`
      CREATE POLICY "voting_sessions_insert_policy" ON "voting_sessions"
        FOR INSERT WITH CHECK (rls_is_admin());
    `);
    this.addSql(`
      CREATE POLICY "voting_sessions_update_policy" ON "voting_sessions"
        FOR UPDATE USING (rls_is_admin());
    `);
    this.addSql(`
      CREATE POLICY "voting_sessions_delete_policy" ON "voting_sessions"
        FOR DELETE USING (rls_is_admin());
    `);

    // RLS policies for voting_categories (admin write, public read when session is visible)
    this.addSql(`
      CREATE POLICY "voting_categories_select_policy" ON "voting_categories"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM voting_sessions vs
            WHERE vs.id = session_id
            AND (vs.status IN ('open', 'closed', 'finalized') OR rls_is_admin())
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "voting_categories_insert_policy" ON "voting_categories"
        FOR INSERT WITH CHECK (rls_is_admin());
    `);
    this.addSql(`
      CREATE POLICY "voting_categories_update_policy" ON "voting_categories"
        FOR UPDATE USING (rls_is_admin());
    `);
    this.addSql(`
      CREATE POLICY "voting_categories_delete_policy" ON "voting_categories"
        FOR DELETE USING (rls_is_admin());
    `);

    // RLS policies for voting_items (admin write, public read when session is visible)
    this.addSql(`
      CREATE POLICY "voting_items_select_policy" ON "voting_items"
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
      CREATE POLICY "voting_items_insert_policy" ON "voting_items"
        FOR INSERT WITH CHECK (rls_is_admin());
    `);
    this.addSql(`
      CREATE POLICY "voting_items_update_policy" ON "voting_items"
        FOR UPDATE USING (rls_is_admin());
    `);
    this.addSql(`
      CREATE POLICY "voting_items_delete_policy" ON "voting_items"
        FOR DELETE USING (rls_is_admin());
    `);

    // RLS policies for voting_ballots (users can insert their own, admins can read all)
    this.addSql(`
      CREATE POLICY "voting_ballots_select_policy" ON "voting_ballots"
        FOR SELECT USING (
          voter_id = auth.uid() OR rls_is_admin()
        );
    `);
    this.addSql(`
      CREATE POLICY "voting_ballots_insert_policy" ON "voting_ballots"
        FOR INSERT WITH CHECK (
          voter_id = auth.uid()
        );
    `);
  }

  async down(): Promise<void> {
    // Drop RLS policies
    this.addSql('DROP POLICY IF EXISTS "voting_ballots_insert_policy" ON "voting_ballots";');
    this.addSql('DROP POLICY IF EXISTS "voting_ballots_select_policy" ON "voting_ballots";');
    this.addSql('DROP POLICY IF EXISTS "voting_items_delete_policy" ON "voting_items";');
    this.addSql('DROP POLICY IF EXISTS "voting_items_update_policy" ON "voting_items";');
    this.addSql('DROP POLICY IF EXISTS "voting_items_insert_policy" ON "voting_items";');
    this.addSql('DROP POLICY IF EXISTS "voting_items_select_policy" ON "voting_items";');
    this.addSql('DROP POLICY IF EXISTS "voting_categories_delete_policy" ON "voting_categories";');
    this.addSql('DROP POLICY IF EXISTS "voting_categories_update_policy" ON "voting_categories";');
    this.addSql('DROP POLICY IF EXISTS "voting_categories_insert_policy" ON "voting_categories";');
    this.addSql('DROP POLICY IF EXISTS "voting_categories_select_policy" ON "voting_categories";');
    this.addSql('DROP POLICY IF EXISTS "voting_sessions_delete_policy" ON "voting_sessions";');
    this.addSql('DROP POLICY IF EXISTS "voting_sessions_update_policy" ON "voting_sessions";');
    this.addSql('DROP POLICY IF EXISTS "voting_sessions_insert_policy" ON "voting_sessions";');
    this.addSql('DROP POLICY IF EXISTS "voting_sessions_select_policy" ON "voting_sessions";');

    // Drop tables (order matters for FK constraints)
    this.addSql('DROP TABLE IF EXISTS "voting_ballots" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "voting_items" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "voting_categories" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "voting_sessions" CASCADE;');

    // Drop enum
    this.addSql('DROP TYPE IF EXISTS voting_session_status CASCADE;');
  }
}
