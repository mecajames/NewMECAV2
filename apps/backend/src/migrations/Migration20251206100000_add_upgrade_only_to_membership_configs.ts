import { Migration } from '@mikro-orm/migrations';

export class Migration20251206100000_add_upgrade_only_to_membership_configs extends Migration {
  async up(): Promise<void> {
    // Add is_upgrade_only column to membership_type_configs table
    this.addSql(`
      ALTER TABLE public.membership_type_configs
      ADD COLUMN IF NOT EXISTS is_upgrade_only boolean DEFAULT false;
    `);

    // Update the team membership type to be upgrade_only
    // This ensures it only shows up as an upgrade option, not on the main membership page
    this.addSql(`
      UPDATE public.membership_type_configs
      SET is_upgrade_only = true
      WHERE category = 'team';
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE public.membership_type_configs
      DROP COLUMN IF EXISTS is_upgrade_only;
    `);
  }
}
