import { Migration } from '@mikro-orm/migrations';

export class Migration20260101200000_add_rls_to_new_tables extends Migration {
  async up(): Promise<void> {
    // Enable RLS on contact_submissions table
    this.addSql(`ALTER TABLE "contact_submissions" ENABLE ROW LEVEL SECURITY;`);

    // RLS policy: Allow admins to view all contact submissions
    this.addSql(`
      CREATE POLICY "contact_submissions_admin_all" ON "contact_submissions"
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );
    `);

    // RLS policy: Allow service role full access (for backend operations)
    this.addSql(`
      CREATE POLICY "contact_submissions_service_role" ON "contact_submissions"
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    `);

    // RLS policy: Allow anyone to insert (for public contact form)
    this.addSql(`
      CREATE POLICY "contact_submissions_insert_public" ON "contact_submissions"
        FOR INSERT
        WITH CHECK (true);
    `);

    // Enable RLS on event_director_assignments table
    this.addSql(`ALTER TABLE "event_director_assignments" ENABLE ROW LEVEL SECURITY;`);

    // RLS policy: Allow admins to manage all event director assignments
    this.addSql(`
      CREATE POLICY "event_director_assignments_admin_all" ON "event_director_assignments"
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );
    `);

    // RLS policy: Allow service role full access (for backend operations)
    this.addSql(`
      CREATE POLICY "event_director_assignments_service_role" ON "event_director_assignments"
        FOR ALL
        USING (auth.role() = 'service_role')
        WITH CHECK (auth.role() = 'service_role');
    `);

    // RLS policy: Allow event directors to view their own assignments
    this.addSql(`
      CREATE POLICY "event_director_assignments_view_own" ON "event_director_assignments"
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM event_directors ed
            WHERE ed.id = event_director_assignments.event_director_id
            AND ed.user_id = auth.uid()
          )
        );
    `);

    // RLS policy: Allow event directors to update their own assignments (for accepting/declining)
    this.addSql(`
      CREATE POLICY "event_director_assignments_update_own" ON "event_director_assignments"
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM event_directors ed
            WHERE ed.id = event_director_assignments.event_director_id
            AND ed.user_id = auth.uid()
          )
        );
    `);
  }

  async down(): Promise<void> {
    // Remove RLS policies for contact_submissions
    this.addSql(`DROP POLICY IF EXISTS "contact_submissions_admin_all" ON "contact_submissions";`);
    this.addSql(`DROP POLICY IF EXISTS "contact_submissions_service_role" ON "contact_submissions";`);
    this.addSql(`DROP POLICY IF EXISTS "contact_submissions_insert_public" ON "contact_submissions";`);
    this.addSql(`ALTER TABLE "contact_submissions" DISABLE ROW LEVEL SECURITY;`);

    // Remove RLS policies for event_director_assignments
    this.addSql(`DROP POLICY IF EXISTS "event_director_assignments_admin_all" ON "event_director_assignments";`);
    this.addSql(`DROP POLICY IF EXISTS "event_director_assignments_service_role" ON "event_director_assignments";`);
    this.addSql(`DROP POLICY IF EXISTS "event_director_assignments_view_own" ON "event_director_assignments";`);
    this.addSql(`DROP POLICY IF EXISTS "event_director_assignments_update_own" ON "event_director_assignments";`);
    this.addSql(`ALTER TABLE "event_director_assignments" DISABLE ROW LEVEL SECURITY;`);
  }
}
