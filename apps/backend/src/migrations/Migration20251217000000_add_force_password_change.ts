import { Migration } from '@mikro-orm/migrations';

export class Migration20251217000000_add_force_password_change extends Migration {

  async up(): Promise<void> {
    // Add force_password_change column to profiles table
    this.addSql(`
      ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;
    `);

    // Create index for easy querying
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_profiles_force_password_change
      ON public.profiles(force_password_change)
      WHERE force_password_change = true;
    `);
  }

  async down(): Promise<void> {
    // Remove the index first
    this.addSql(`DROP INDEX IF EXISTS idx_profiles_force_password_change;`);

    // Remove the column
    this.addSql(`ALTER TABLE public.profiles DROP COLUMN IF EXISTS force_password_change;`);
  }
}
