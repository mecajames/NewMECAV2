import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Add new columns to achievement_definitions
 *
 * Adds:
 * - group_name: for grouping achievements (e.g., "dB Clubs")
 * - achievement_type: dynamic or static
 * - render_value: the value to display on the image
 */
export class Migration20260104150000 extends Migration {
  async up(): Promise<void> {
    // Create the achievement_type enum
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_type') THEN
          CREATE TYPE achievement_type AS ENUM ('dynamic', 'static');
        END IF;
      END$$;
    `);

    // Add group_name column
    this.addSql(`
      ALTER TABLE "achievement_definitions"
      ADD COLUMN IF NOT EXISTS "group_name" varchar(100);
    `);

    // Add achievement_type column
    this.addSql(`
      ALTER TABLE "achievement_definitions"
      ADD COLUMN IF NOT EXISTS "achievement_type" achievement_type NOT NULL DEFAULT 'dynamic';
    `);

    // Add render_value column
    this.addSql(`
      ALTER TABLE "achievement_definitions"
      ADD COLUMN IF NOT EXISTS "render_value" decimal(10,2);
    `);

    // Update existing records to set render_value = threshold_value if not set
    this.addSql(`
      UPDATE "achievement_definitions"
      SET "render_value" = "threshold_value"
      WHERE "render_value" IS NULL;
    `);

    // Update existing records to set group_name based on name pattern
    this.addSql(`
      UPDATE "achievement_definitions"
      SET "group_name" = 'dB Clubs'
      WHERE "name" LIKE '%dB Club%' AND "group_name" IS NULL;
    `);
  }

  async down(): Promise<void> {
    // Remove columns
    this.addSql(`ALTER TABLE "achievement_definitions" DROP COLUMN IF EXISTS "render_value";`);
    this.addSql(`ALTER TABLE "achievement_definitions" DROP COLUMN IF EXISTS "achievement_type";`);
    this.addSql(`ALTER TABLE "achievement_definitions" DROP COLUMN IF EXISTS "group_name";`);

    // Drop the enum type
    this.addSql(`DROP TYPE IF EXISTS achievement_type;`);
  }
}
