import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Fix Achievement Table Policy Overlap
 *
 * Fixes "Multiple Permissive Policies" warnings on achievement tables.
 * Each table has both _select_all (FOR SELECT) and _admin_all (FOR ALL),
 * causing 2 permissive policies for SELECT operations.
 *
 * Solution: Replace _admin_all (FOR ALL) with separate INSERT, UPDATE, DELETE policies.
 * This leaves only 1 policy per operation type.
 */
export class Migration20260115210000_fix_achievement_policy_overlap extends Migration {
  async up(): Promise<void> {
    // =========================================================================
    // ACHIEVEMENT_DEFINITIONS - Replace FOR ALL with INSERT/UPDATE/DELETE
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "achievement_definitions_admin_all" ON "achievement_definitions";`);
    this.addSql(`
      CREATE POLICY "achievement_definitions_admin_insert" ON "achievement_definitions"
        FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);
    this.addSql(`
      CREATE POLICY "achievement_definitions_admin_update" ON "achievement_definitions"
        FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);
    this.addSql(`
      CREATE POLICY "achievement_definitions_admin_delete" ON "achievement_definitions"
        FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);

    // =========================================================================
    // ACHIEVEMENT_RECIPIENTS - Replace FOR ALL with INSERT/UPDATE/DELETE
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "achievement_recipients_admin_all" ON "achievement_recipients";`);
    this.addSql(`
      CREATE POLICY "achievement_recipients_admin_insert" ON "achievement_recipients"
        FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);
    this.addSql(`
      CREATE POLICY "achievement_recipients_admin_update" ON "achievement_recipients"
        FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);
    this.addSql(`
      CREATE POLICY "achievement_recipients_admin_delete" ON "achievement_recipients"
        FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);

    // =========================================================================
    // ACHIEVEMENT_TEMPLATES - Replace FOR ALL with INSERT/UPDATE/DELETE
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "achievement_templates_admin_all" ON "achievement_templates";`);
    this.addSql(`
      CREATE POLICY "achievement_templates_admin_insert" ON "achievement_templates"
        FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);
    this.addSql(`
      CREATE POLICY "achievement_templates_admin_update" ON "achievement_templates"
        FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);
    this.addSql(`
      CREATE POLICY "achievement_templates_admin_delete" ON "achievement_templates"
        FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);
  }

  async down(): Promise<void> {
    // Restore original _admin_all policies and remove the split policies

    // Achievement definitions
    this.addSql(`DROP POLICY IF EXISTS "achievement_definitions_admin_insert" ON "achievement_definitions";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_definitions_admin_update" ON "achievement_definitions";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_definitions_admin_delete" ON "achievement_definitions";`);
    this.addSql(`
      CREATE POLICY "achievement_definitions_admin_all" ON "achievement_definitions"
        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);

    // Achievement recipients
    this.addSql(`DROP POLICY IF EXISTS "achievement_recipients_admin_insert" ON "achievement_recipients";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_recipients_admin_update" ON "achievement_recipients";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_recipients_admin_delete" ON "achievement_recipients";`);
    this.addSql(`
      CREATE POLICY "achievement_recipients_admin_all" ON "achievement_recipients"
        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);

    // Achievement templates
    this.addSql(`DROP POLICY IF EXISTS "achievement_templates_admin_insert" ON "achievement_templates";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_templates_admin_update" ON "achievement_templates";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_templates_admin_delete" ON "achievement_templates";`);
    this.addSql(`
      CREATE POLICY "achievement_templates_admin_all" ON "achievement_templates"
        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);
  }
}
