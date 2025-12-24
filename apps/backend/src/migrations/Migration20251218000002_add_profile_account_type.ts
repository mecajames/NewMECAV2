import { Migration } from '@mikro-orm/migrations';

export class Migration20251218000002_add_profile_account_type extends Migration {

  async up(): Promise<void> {
    // Add account_type column to profiles table
    // 'member' for full members, 'basic' for guest registrations converted to accounts
    this.addSql(`
      ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'member';
    `);

    // Create index for easy querying by account type
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_profiles_account_type
      ON public.profiles(account_type);
    `);

    // Add check constraint to ensure valid values
    this.addSql(`
      ALTER TABLE public.profiles
      ADD CONSTRAINT chk_account_type CHECK (account_type IN ('basic', 'member'));
    `);
  }

  async down(): Promise<void> {
    // Remove the check constraint
    this.addSql(`ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_account_type;`);

    // Remove the index
    this.addSql(`DROP INDEX IF EXISTS idx_profiles_account_type;`);

    // Remove the column
    this.addSql(`ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_type;`);
  }
}
