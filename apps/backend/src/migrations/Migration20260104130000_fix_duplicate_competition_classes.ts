import { Migration } from '@mikro-orm/migrations';

export class Migration20260104130000_fix_duplicate_competition_classes extends Migration {
  async up(): Promise<void> {
    // Remove duplicate competition classes, keeping the oldest one for each name+format combination
    this.addSql(`
      DELETE FROM competition_classes
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY name, format ORDER BY created_at) as rn
          FROM competition_classes
        ) t
        WHERE rn > 1
      );
    `);

    // Add unique constraint to prevent future duplicates (if not exists)
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'competition_classes_name_format_unique'
        ) THEN
          ALTER TABLE competition_classes
          ADD CONSTRAINT competition_classes_name_format_unique
          UNIQUE (name, format);
        END IF;
      END $$;
    `);
  }

  async down(): Promise<void> {
    // Remove the unique constraint
    this.addSql(`
      ALTER TABLE competition_classes
      DROP CONSTRAINT IF EXISTS competition_classes_name_format_unique;
    `);
  }
}
