import { Migration } from '@mikro-orm/migrations';

export class Migration20260304000000_banner_multi_position extends Migration {
  async up(): Promise<void> {
    // Add new positions column as text array
    this.addSql(`ALTER TABLE banners ADD COLUMN positions text[] DEFAULT '{}';`);

    // Copy existing single position into the array
    this.addSql(`UPDATE banners SET positions = ARRAY[position::text] WHERE position IS NOT NULL;`);

    // Drop the old single-value column (and its associated index)
    this.addSql(`ALTER TABLE banners DROP COLUMN position;`);

    // Create GIN index for array contains queries
    this.addSql(`CREATE INDEX idx_banners_positions_gin ON banners USING GIN (positions);`);

    // Ensure status/date index exists for performance
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_banners_status_dates ON banners (status, start_date, end_date);`);
  }

  async down(): Promise<void> {
    // Re-add the single position column
    this.addSql(`ALTER TABLE banners ADD COLUMN position banner_position;`);

    // Copy first element of array back to single column
    this.addSql(`UPDATE banners SET position = positions[1]::banner_position WHERE array_length(positions, 1) > 0;`);

    // Drop the positions array column
    this.addSql(`ALTER TABLE banners DROP COLUMN positions;`);

    // Drop the GIN index (dropped with column)
    this.addSql(`DROP INDEX IF EXISTS idx_banners_positions_gin;`);
    this.addSql(`DROP INDEX IF EXISTS idx_banners_status_dates;`);
  }
}
