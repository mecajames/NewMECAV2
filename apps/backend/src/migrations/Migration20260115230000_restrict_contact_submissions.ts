import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Restrict Contact Submissions to Admin Only
 *
 * All user contact now goes through the support ticket system.
 * Contact submissions table is now admin-only for legacy data management.
 */
export class Migration20260115230000_restrict_contact_submissions extends Migration {
  async up(): Promise<void> {
    this.addSql(`DROP POLICY IF EXISTS "contact_submissions_insert" ON "contact_submissions";`);
    this.addSql(`
      CREATE POLICY "contact_submissions_insert" ON "contact_submissions"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP POLICY IF EXISTS "contact_submissions_insert" ON "contact_submissions";`);
    this.addSql(`
      CREATE POLICY "contact_submissions_insert" ON "contact_submissions"
        FOR INSERT WITH CHECK (true);
    `);
  }
}
