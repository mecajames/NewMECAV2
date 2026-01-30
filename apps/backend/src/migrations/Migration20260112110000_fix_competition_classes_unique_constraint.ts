import { Migration } from '@mikro-orm/migrations';

export class Migration20260112110000_fix_competition_classes_unique_constraint extends Migration {
  async up(): Promise<void> {
    // Drop the existing constraint that only checks (name, format)
    this.addSql(`
      ALTER TABLE competition_classes
      DROP CONSTRAINT IF EXISTS competition_classes_name_format_unique;
    `);

    // Add a new constraint that includes season_id
    // This allows the same class name+format to exist in different seasons
    this.addSql(`
      ALTER TABLE competition_classes
      ADD CONSTRAINT competition_classes_name_format_season_unique
      UNIQUE (name, format, season_id);
    `);
  }

  async down(): Promise<void> {
    // Revert to the old constraint (without season_id)
    this.addSql(`
      ALTER TABLE competition_classes
      DROP CONSTRAINT IF EXISTS competition_classes_name_format_season_unique;
    `);

    this.addSql(`
      ALTER TABLE competition_classes
      ADD CONSTRAINT competition_classes_name_format_unique
      UNIQUE (name, format);
    `);
  }
}
