import { Migration } from '@mikro-orm/migrations';

export class Migration20260101240000_fix_overlapping_policies extends Migration {
  override async up(): Promise<void> {
    // =========================================================================
    // Fix contact_submissions - avoid overlapping ALL + INSERT policies
    // =========================================================================

    // Drop existing policies
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_service_role ON contact_submissions;`);
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_public_insert ON contact_submissions;`);

    // Create separate policies for each command (no overlap)
    // Service role can SELECT, UPDATE, DELETE
    this.addSql(`
      CREATE POLICY contact_submissions_service_select ON contact_submissions FOR SELECT TO public
        USING ((SELECT auth.role()) = 'service_role');
    `);
    this.addSql(`
      CREATE POLICY contact_submissions_service_update ON contact_submissions FOR UPDATE TO public
        USING ((SELECT auth.role()) = 'service_role');
    `);
    this.addSql(`
      CREATE POLICY contact_submissions_service_delete ON contact_submissions FOR DELETE TO public
        USING ((SELECT auth.role()) = 'service_role');
    `);

    // Anyone can INSERT (contact form) - service_role also needs insert
    this.addSql(`
      CREATE POLICY contact_submissions_insert ON contact_submissions FOR INSERT TO public
        WITH CHECK (true);
    `);

    // =========================================================================
    // Fix event_director_assignments - avoid overlapping ALL + SELECT policies
    // =========================================================================

    // Drop existing policies
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_service_role ON event_director_assignments;`);
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_select_own ON event_director_assignments;`);

    // Service role can INSERT, UPDATE, DELETE (not SELECT to avoid overlap)
    this.addSql(`
      CREATE POLICY event_director_assignments_service_insert ON event_director_assignments FOR INSERT TO public
        WITH CHECK ((SELECT auth.role()) = 'service_role');
    `);
    this.addSql(`
      CREATE POLICY event_director_assignments_service_update ON event_director_assignments FOR UPDATE TO public
        USING ((SELECT auth.role()) = 'service_role');
    `);
    this.addSql(`
      CREATE POLICY event_director_assignments_service_delete ON event_director_assignments FOR DELETE TO public
        USING ((SELECT auth.role()) = 'service_role');
    `);

    // SELECT: service_role OR own assignments
    this.addSql(`
      CREATE POLICY event_director_assignments_select ON event_director_assignments FOR SELECT TO public
        USING (
          (SELECT auth.role()) = 'service_role'
          OR event_director_id IN (
            SELECT id FROM event_directors WHERE user_id = (SELECT auth.uid())
          )
        );
    `);
  }

  override async down(): Promise<void> {
    // Drop the split policies
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_service_select ON contact_submissions;`);
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_service_update ON contact_submissions;`);
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_service_delete ON contact_submissions;`);
    this.addSql(`DROP POLICY IF EXISTS contact_submissions_insert ON contact_submissions;`);

    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_service_insert ON event_director_assignments;`);
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_service_update ON event_director_assignments;`);
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_service_delete ON event_director_assignments;`);
    this.addSql(`DROP POLICY IF EXISTS event_director_assignments_select ON event_director_assignments;`);

    // Restore previous policies
    this.addSql(`
      CREATE POLICY contact_submissions_service_role ON contact_submissions FOR ALL TO public
        USING ((SELECT auth.role()) = 'service_role')
        WITH CHECK ((SELECT auth.role()) = 'service_role');
    `);
    this.addSql(`
      CREATE POLICY contact_submissions_public_insert ON contact_submissions FOR INSERT TO public
        WITH CHECK (true);
    `);

    this.addSql(`
      CREATE POLICY event_director_assignments_service_role ON event_director_assignments FOR ALL TO public
        USING ((SELECT auth.role()) = 'service_role')
        WITH CHECK ((SELECT auth.role()) = 'service_role');
    `);
    this.addSql(`
      CREATE POLICY event_director_assignments_select_own ON event_director_assignments FOR SELECT TO public
        USING (
          event_director_id IN (
            SELECT id FROM event_directors WHERE user_id = (SELECT auth.uid())
          )
        );
    `);
  }
}
