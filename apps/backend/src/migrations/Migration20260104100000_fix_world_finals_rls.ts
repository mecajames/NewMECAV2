import { Migration } from '@mikro-orm/migrations';

export class Migration20260104100000_fix_world_finals_rls extends Migration {
  async up(): Promise<void> {
    // Drop existing overlapping policies
    this.addSql(`
      DROP POLICY IF EXISTS "world_finals_qualifications_select_own" ON "public"."world_finals_qualifications";
    `);

    this.addSql(`
      DROP POLICY IF EXISTS "world_finals_qualifications_admin_all" ON "public"."world_finals_qualifications";
    `);

    // Create a single optimized SELECT policy for authenticated users
    // Uses (SELECT auth.uid()) to cache the auth call instead of calling auth.uid() multiple times
    this.addSql(`
      CREATE POLICY "world_finals_qualifications_select" ON "public"."world_finals_qualifications"
        FOR SELECT
        TO authenticated
        USING (
          user_id = (SELECT auth.uid())
          OR
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role IN ('admin', 'event_director')
          )
        );
    `);

    // Allow public/anon to see qualifications (for leaderboard highlighting)
    // This is read-only and doesn't expose sensitive data
    this.addSql(`
      CREATE POLICY "world_finals_qualifications_public_select" ON "public"."world_finals_qualifications"
        FOR SELECT
        TO anon
        USING (true);
    `);

    // Service role bypasses RLS automatically, so no explicit policy needed for modifications
    // All INSERT/UPDATE/DELETE operations go through the backend which uses service role
  }

  async down(): Promise<void> {
    // Drop new policies
    this.addSql(`
      DROP POLICY IF EXISTS "world_finals_qualifications_select" ON "public"."world_finals_qualifications";
    `);

    this.addSql(`
      DROP POLICY IF EXISTS "world_finals_qualifications_public_select" ON "public"."world_finals_qualifications";
    `);

    // Restore original policies
    this.addSql(`
      CREATE POLICY "world_finals_qualifications_select_own" ON "public"."world_finals_qualifications"
        FOR SELECT
        USING (
          user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'event_director')
          )
        );
    `);

    this.addSql(`
      CREATE POLICY "world_finals_qualifications_admin_all" ON "public"."world_finals_qualifications"
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );
    `);
  }
}
