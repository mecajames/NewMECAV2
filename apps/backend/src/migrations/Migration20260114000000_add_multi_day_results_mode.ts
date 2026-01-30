import { Migration } from '@mikro-orm/migrations';

export class Migration20260114000000_add_multi_day_results_mode extends Migration {
  async up(): Promise<void> {
    // Create enum type for multi-day results mode
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE multi_day_results_mode_enum AS ENUM ('separate', 'combined_score', 'combined_points');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Add multi_day_results_mode column to events table
    this.addSql(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS multi_day_results_mode multi_day_results_mode_enum DEFAULT NULL;
    `);

    // Add comment for documentation
    this.addSql(`
      COMMENT ON COLUMN events.multi_day_results_mode IS
        'For multi-day events: separate (default) = each day calculated independently, combined_score = sum scores then calculate points, combined_points = calculate each day''s points then sum';
    `);
  }

  async down(): Promise<void> {
    // Remove the column
    this.addSql(`
      ALTER TABLE events DROP COLUMN IF EXISTS multi_day_results_mode;
    `);

    // Drop the enum type
    this.addSql(`
      DROP TYPE IF EXISTS multi_day_results_mode_enum;
    `);
  }
}
