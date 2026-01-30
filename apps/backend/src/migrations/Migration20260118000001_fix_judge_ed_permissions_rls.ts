import { Migration } from '@mikro-orm/migrations';

export class Migration20260118000001_fix_judge_ed_permissions_rls extends Migration {
  async up(): Promise<void> {
    // Remove the problematic RLS policy that was causing infinite recursion
    // The profiles table already has working RLS policies - we don't need a new one
    this.addSql(`
      DROP POLICY IF EXISTS "profiles_judge_ed_permissions_select" ON "profiles";
    `);
  }

  async down(): Promise<void> {
    // No-op - we don't want to recreate the broken policy
  }
}
