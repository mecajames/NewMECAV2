import { Migration } from '@mikro-orm/migrations';

export class Migration20260101230000_consolidate_rls_policies extends Migration {
  override async up(): Promise<void> {
    // =========================================================================
    // Fix contact_submissions - consolidate multiple permissive policies
    // =========================================================================

    // Drop all existing policies
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_admin_all ON contact_submissions;`);
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_insert_public ON contact_submissions;`);
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_service_role ON contact_submissions;`);

    // Create a single service_role policy for backend operations (most operations)
    // Using (SELECT auth.role()) to cache the function call
    this.addSql(`
      CREATE POLICY contact_submissions_service_role ON contact_submissions FOR ALL TO public
        USING ((SELECT auth.role()) = 'service_role')
        WITH CHECK ((SELECT auth.role()) = 'service_role');
    `);

    // Create a single policy for anonymous/authenticated INSERT (contact form)
    this.addSql(`
      CREATE POLICY contact_submissions_public_insert ON contact_submissions FOR INSERT TO public
        WITH CHECK (true);
    `);

    // =========================================================================
    // Fix event_director_assignments - consolidate policies
    // =========================================================================

    // Drop all existing policies
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_admin_all ON event_director_assignments;`);
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_service_role ON event_director_assignments;`);
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_update_own ON event_director_assignments;`);
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_view_own ON event_director_assignments;`);

    // Single service_role policy (backend handles all access control)
    this.addSql(`
      CREATE POLICY event_director_assignments_service_role ON event_director_assignments FOR ALL TO public
        USING ((SELECT auth.role()) = 'service_role')
        WITH CHECK ((SELECT auth.role()) = 'service_role');
    `);

    // Users can view their own assignments (for direct Supabase client queries if needed)
    this.addSql(`
      CREATE POLICY event_director_assignments_select_own ON event_director_assignments FOR SELECT TO public
        USING (
          event_director_id IN (
            SELECT id FROM event_directors WHERE user_id = (SELECT auth.uid())
          )
        );
    `);
  }

  override async down(): Promise<void> {
    // Restore original policies for contact_submissions
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_service_role ON contact_submissions;`);
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_public_insert ON contact_submissions;`);

    this.addSql(`
      CREATE POLICY contact_submissions_admin_all ON contact_submissions FOR ALL TO public
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'::user_role
          )
        );
    `);
    this.addSql(`
      CREATE POLICY contact_submissions_insert_public ON contact_submissions FOR INSERT TO public
        WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY contact_submissions_service_role ON contact_submissions FOR ALL TO public
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    `);

    // Restore original policies for event_director_assignments
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_service_role ON event_director_assignments;`);
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_select_own ON event_director_assignments;`);

    this.addSql(`
      CREATE POLICY event_director_assignments_admin_all ON event_director_assignments FOR ALL TO public
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'::user_role
          )
        );
    `);
    this.addSql(`
      CREATE POLICY event_director_assignments_service_role ON event_director_assignments FOR ALL TO public
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    `);
    this.addSql(`
      CREATE POLICY event_director_assignments_view_own ON event_director_assignments FOR SELECT TO public
        USING (
          EXISTS (
            SELECT 1 FROM event_directors ed
            WHERE ed.id = event_director_assignments.event_director_id
            AND ed.user_id = auth.uid()
          )
        );
    `);
    this.addSql(`
      CREATE POLICY event_director_assignments_update_own ON event_director_assignments FOR UPDATE TO public
        USING (
          EXISTS (
            SELECT 1 FROM event_directors ed
            WHERE ed.id = event_director_assignments.event_director_id
            AND ed.user_id = auth.uid()
          )
        );
    `);
  }
}
