import { Migration } from '@mikro-orm/migrations';

export class Migration20260117000000_add_is_trainer_to_profiles extends Migration {
  async up(): Promise<void> {
    // Add is_trainer column to profiles table
    this.addSql(`
      ALTER TABLE "profiles"
      ADD COLUMN IF NOT EXISTS "is_trainer" boolean DEFAULT false;
    `);

    // Create index for efficient trainer lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_profiles_is_trainer"
      ON "profiles"("is_trainer")
      WHERE "is_trainer" = true;
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "idx_profiles_is_trainer";');
    this.addSql('ALTER TABLE "profiles" DROP COLUMN IF EXISTS "is_trainer";');
  }
}
