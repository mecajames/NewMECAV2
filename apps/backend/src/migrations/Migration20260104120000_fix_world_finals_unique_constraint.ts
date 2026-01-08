import { Migration } from '@mikro-orm/migrations';

export class Migration20260104120000_fix_world_finals_unique_constraint extends Migration {
  async up(): Promise<void> {
    // Drop the old unique constraint that only covered (season_id, meca_id)
    // This prevented competitors from qualifying in multiple classes within the same season
    this.addSql(`
      ALTER TABLE "public"."world_finals_qualifications"
      DROP CONSTRAINT IF EXISTS "world_finals_qualifications_season_id_meca_id_key";
    `);

    // The correct constraint on (season_id, meca_id, competition_class) should already exist
    // But ensure it exists just in case
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'world_finals_qualifications_season_meca_class_unique'
        ) THEN
          ALTER TABLE "public"."world_finals_qualifications"
          ADD CONSTRAINT "world_finals_qualifications_season_meca_class_unique"
          UNIQUE ("season_id", "meca_id", "competition_class");
        END IF;
      END $$;
    `);
  }

  async down(): Promise<void> {
    // Restore the old constraint (note: this may fail if there are multiple classes per competitor)
    this.addSql(`
      ALTER TABLE "public"."world_finals_qualifications"
      DROP CONSTRAINT IF EXISTS "world_finals_qualifications_season_meca_class_unique";
    `);

    this.addSql(`
      ALTER TABLE "public"."world_finals_qualifications"
      ADD CONSTRAINT "world_finals_qualifications_season_id_meca_id_key"
      UNIQUE ("season_id", "meca_id");
    `);
  }
}
