import { Migration } from '@mikro-orm/migrations';

export class Migration20260104000000_world_finals_per_class extends Migration {
  async up(): Promise<void> {
    // Add competition_class column to world_finals_qualifications
    this.addSql(`
      ALTER TABLE public.world_finals_qualifications
      ADD COLUMN IF NOT EXISTS competition_class TEXT;
    `);

    // Drop the old unique constraint (season_id, meca_id)
    this.addSql(`
      ALTER TABLE public.world_finals_qualifications
      DROP CONSTRAINT IF EXISTS world_finals_qualifications_season_id_meca_id_unique;
    `);

    // Set a default value for existing rows (if any)
    this.addSql(`
      UPDATE public.world_finals_qualifications
      SET competition_class = 'Unknown'
      WHERE competition_class IS NULL;
    `);

    // Make competition_class NOT NULL
    this.addSql(`
      ALTER TABLE public.world_finals_qualifications
      ALTER COLUMN competition_class SET NOT NULL;
    `);

    // Add new unique constraint (season_id, meca_id, competition_class)
    this.addSql(`
      ALTER TABLE public.world_finals_qualifications
      ADD CONSTRAINT world_finals_qualifications_season_meca_class_unique
      UNIQUE (season_id, meca_id, competition_class);
    `);
  }

  async down(): Promise<void> {
    // Drop the new unique constraint
    this.addSql(`
      ALTER TABLE public.world_finals_qualifications
      DROP CONSTRAINT IF EXISTS world_finals_qualifications_season_meca_class_unique;
    `);

    // Remove competition_class column
    this.addSql(`
      ALTER TABLE public.world_finals_qualifications
      DROP COLUMN IF EXISTS competition_class;
    `);

    // Restore old unique constraint
    this.addSql(`
      ALTER TABLE public.world_finals_qualifications
      ADD CONSTRAINT world_finals_qualifications_season_id_meca_id_unique
      UNIQUE (season_id, meca_id);
    `);
  }
}
