import { Migration } from '@mikro-orm/migrations';

export class Migration20260101220000_optimize_rls_policies extends Migration {
  override async up(): Promise<void> {
    // Optimize contact_submissions_admin_all policy
    // Use (SELECT auth.uid()) to cache the value and avoid re-evaluation per row
    this.addSql(`
      DROP POLICY IF EXISTS contact_submissions_admin_all ON contact_submissions;
      CREATE POLICY contact_submissions_admin_all ON contact_submissions FOR ALL TO public
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'admin'::user_role
          )
        );
    `);

    // Optimize event_director_assignments policies
    this.addSql(`
      DROP POLICY IF EXISTS event_director_assignments_admin_all ON event_director_assignments;
      CREATE POLICY event_director_assignments_admin_all ON event_director_assignments FOR ALL TO public
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (SELECT auth.uid())
            AND profiles.role = 'admin'::user_role
          )
        );
    `);

    this.addSql(`
      DROP POLICY IF EXISTS event_director_assignments_view_own ON event_director_assignments;
      CREATE POLICY event_director_assignments_view_own ON event_director_assignments FOR SELECT TO public
        USING (
          EXISTS (
            SELECT 1 FROM event_directors ed
            WHERE ed.id = event_director_assignments.event_director_id
            AND ed.user_id = (SELECT auth.uid())
          )
        );
    `);

    this.addSql(`
      DROP POLICY IF EXISTS event_director_assignments_update_own ON event_director_assignments;
      CREATE POLICY event_director_assignments_update_own ON event_director_assignments FOR UPDATE TO public
        USING (
          EXISTS (
            SELECT 1 FROM event_directors ed
            WHERE ed.id = event_director_assignments.event_director_id
            AND ed.user_id = (SELECT auth.uid())
          )
        );
    `);

    // Optimize profiles update policy
    this.addSql(`
      DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
      CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO public
        USING (id = (SELECT auth.uid()));
    `);
  }

  override async down(): Promise<void> {
    // Revert to original policies (without SELECT optimization)
    this.addSql(`
      DROP POLICY IF EXISTS contact_submissions_admin_all ON contact_submissions;
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
      DROP POLICY IF EXISTS event_director_assignments_admin_all ON event_director_assignments;
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
      DROP POLICY IF EXISTS event_director_assignments_view_own ON event_director_assignments;
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
      DROP POLICY IF EXISTS event_director_assignments_update_own ON event_director_assignments;
      CREATE POLICY event_director_assignments_update_own ON event_director_assignments FOR UPDATE TO public
        USING (
          EXISTS (
            SELECT 1 FROM event_directors ed
            WHERE ed.id = event_director_assignments.event_director_id
            AND ed.user_id = auth.uid()
          )
        );
    `);

    this.addSql(`
      DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
      CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO public
        USING (id = (SELECT auth.uid() AS uid));
    `);
  }
}
