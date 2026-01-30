import { Migration } from '@mikro-orm/migrations';

export class Migration20260121000001_fix_banner_engagement_rls extends Migration {
  async up(): Promise<void> {
    // Drop the restrictive select policy
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_select_policy" ON "banner_engagements";');

    // Create a new policy that allows the backend service to select engagements
    // This is needed for the recordEngagement function to check if an engagement already exists
    this.addSql(`
      CREATE POLICY "banner_engagements_select_policy" ON "banner_engagements"
        FOR SELECT USING (true);
    `);

    // Also ensure the update policy is correct (already set to true, but recreate to be safe)
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_update_policy" ON "banner_engagements";');
    this.addSql(`
      CREATE POLICY "banner_engagements_update_policy" ON "banner_engagements"
        FOR UPDATE USING (true) WITH CHECK (true);
    `);
  }

  async down(): Promise<void> {
    // Restore the original restrictive policy
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_select_policy" ON "banner_engagements";');
    this.addSql(`
      CREATE POLICY "banner_engagements_select_policy" ON "banner_engagements"
        FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql('DROP POLICY IF EXISTS "banner_engagements_update_policy" ON "banner_engagements";');
    this.addSql(`
      CREATE POLICY "banner_engagements_update_policy" ON "banner_engagements"
        FOR UPDATE USING (true);
    `);
  }
}
