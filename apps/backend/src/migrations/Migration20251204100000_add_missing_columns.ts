import { Migration } from '@mikro-orm/migrations';

export class Migration20251204100000_add_missing_columns extends Migration {
  async up(): Promise<void> {
    // Add status column to rulebooks if it doesn't exist
    this.addSql(`
      ALTER TABLE "rulebooks"
      ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';
    `);

    // Add is_public column to profiles if it doesn't exist
    this.addSql(`
      ALTER TABLE "profiles"
      ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false;
    `);

    // Add other potentially missing profile columns
    this.addSql(`
      ALTER TABLE "profiles"
      ADD COLUMN IF NOT EXISTS "vehicle_info" jsonb,
      ADD COLUMN IF NOT EXISTS "car_audio_system" jsonb,
      ADD COLUMN IF NOT EXISTS "profile_images" jsonb;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "rulebooks"
      DROP COLUMN IF EXISTS "status";
    `);

    this.addSql(`
      ALTER TABLE "profiles"
      DROP COLUMN IF EXISTS "is_public",
      DROP COLUMN IF EXISTS "vehicle_info",
      DROP COLUMN IF EXISTS "car_audio_system",
      DROP COLUMN IF EXISTS "profile_images";
    `);
  }
}
