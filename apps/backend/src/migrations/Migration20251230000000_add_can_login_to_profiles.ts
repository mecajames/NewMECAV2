import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Add can_login column to profiles table
 *
 * This column tracks whether a profile can log in independently.
 * - Master profiles: true (can log in)
 * - Secondary profiles with their own login: true
 * - Secondary profiles without their own login: false (managed by master)
 */
export class Migration20251230000000 extends Migration {
  async up(): Promise<void> {
    // Add can_login column to profiles table
    // Default to true since most existing profiles should be able to log in
    this.addSql(`
      ALTER TABLE "profiles"
      ADD COLUMN IF NOT EXISTS "can_login" boolean NOT NULL DEFAULT true;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "can_login";`);
  }
}
