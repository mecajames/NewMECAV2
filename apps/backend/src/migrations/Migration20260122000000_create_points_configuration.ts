import { Migration } from '@mikro-orm/migrations';

export class Migration20260122000000_create_points_configuration extends Migration {
  async up(): Promise<void> {
    // Create points_configuration table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "points_configuration" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Season association (one config per season)
        "season_id" uuid NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,

        -- Standard Event Base Points (multiplied by 1X, 2X, 3X)
        "standard_1st_place" integer NOT NULL DEFAULT 5,
        "standard_2nd_place" integer NOT NULL DEFAULT 4,
        "standard_3rd_place" integer NOT NULL DEFAULT 3,
        "standard_4th_place" integer NOT NULL DEFAULT 2,
        "standard_5th_place" integer NOT NULL DEFAULT 1,

        -- 4X Event Points (SQ, Install, RTA, etc.)
        "four_x_1st_place" integer NOT NULL DEFAULT 30,
        "four_x_2nd_place" integer NOT NULL DEFAULT 27,
        "four_x_3rd_place" integer NOT NULL DEFAULT 24,
        "four_x_4th_place" integer NOT NULL DEFAULT 21,
        "four_x_5th_place" integer NOT NULL DEFAULT 18,

        -- Extended 4X Placement Points (6th-50th place)
        "four_x_extended_enabled" boolean NOT NULL DEFAULT false,
        "four_x_extended_points" integer NOT NULL DEFAULT 15,
        "four_x_extended_max_place" integer NOT NULL DEFAULT 50,

        -- Metadata
        "is_active" boolean NOT NULL DEFAULT true,
        "description" text,
        "updated_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),

        -- Constraints
        CONSTRAINT "points_configuration_standard_order" CHECK (
          standard_1st_place >= standard_2nd_place AND
          standard_2nd_place >= standard_3rd_place AND
          standard_3rd_place >= standard_4th_place AND
          standard_4th_place >= standard_5th_place
        ),
        CONSTRAINT "points_configuration_4x_order" CHECK (
          four_x_1st_place >= four_x_2nd_place AND
          four_x_2nd_place >= four_x_3rd_place AND
          four_x_3rd_place >= four_x_4th_place AND
          four_x_4th_place >= four_x_5th_place
        ),
        CONSTRAINT "points_configuration_extended_range" CHECK (
          four_x_extended_max_place >= 6 AND four_x_extended_max_place <= 100
        ),
        CONSTRAINT "points_configuration_positive_values" CHECK (
          standard_1st_place >= 0 AND standard_2nd_place >= 0 AND standard_3rd_place >= 0 AND
          standard_4th_place >= 0 AND standard_5th_place >= 0 AND
          four_x_1st_place >= 0 AND four_x_2nd_place >= 0 AND four_x_3rd_place >= 0 AND
          four_x_4th_place >= 0 AND four_x_5th_place >= 0 AND four_x_extended_points >= 0
        )
      );
    `);

    // Create unique index on season_id (only one config per season)
    this.addSql('CREATE UNIQUE INDEX IF NOT EXISTS "idx_points_configuration_season" ON "points_configuration"("season_id");');

    // Create index for active configurations
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_points_configuration_active" ON "points_configuration"("is_active");');

    // Enable RLS
    this.addSql('ALTER TABLE "points_configuration" ENABLE ROW LEVEL SECURITY;');

    // Create RLS policies (admin only for all operations, public read for active configs)
    this.addSql(`
      CREATE POLICY "points_configuration_select_policy" ON "points_configuration"
        FOR SELECT USING (true);
    `);

    this.addSql(`
      CREATE POLICY "points_configuration_insert_policy" ON "points_configuration"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
          )
        );
    `);

    this.addSql(`
      CREATE POLICY "points_configuration_update_policy" ON "points_configuration"
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
          )
        );
    `);

    this.addSql(`
      CREATE POLICY "points_configuration_delete_policy" ON "points_configuration"
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
          )
        );
    `);

    // Create default configurations for all existing seasons
    this.addSql(`
      INSERT INTO "points_configuration" (
        "season_id",
        "standard_1st_place", "standard_2nd_place", "standard_3rd_place", "standard_4th_place", "standard_5th_place",
        "four_x_1st_place", "four_x_2nd_place", "four_x_3rd_place", "four_x_4th_place", "four_x_5th_place",
        "four_x_extended_enabled", "four_x_extended_points", "four_x_extended_max_place",
        "is_active", "description"
      )
      SELECT
        s.id,
        5, 4, 3, 2, 1,
        30, 27, 24, 21, 18,
        false, 15, 50,
        true, 'Default configuration for ' || s.name
      FROM "seasons" s
      WHERE NOT EXISTS (
        SELECT 1 FROM "points_configuration" pc WHERE pc.season_id = s.id
      );
    `);

    // Create function to auto-create config when new season is created
    this.addSql(`
      CREATE OR REPLACE FUNCTION create_default_points_configuration()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO points_configuration (
          season_id,
          standard_1st_place, standard_2nd_place, standard_3rd_place, standard_4th_place, standard_5th_place,
          four_x_1st_place, four_x_2nd_place, four_x_3rd_place, four_x_4th_place, four_x_5th_place,
          four_x_extended_enabled, four_x_extended_points, four_x_extended_max_place,
          is_active, description
        ) VALUES (
          NEW.id,
          5, 4, 3, 2, 1,
          30, 27, 24, 21, 18,
          false, 15, 50,
          true, 'Default configuration for ' || NEW.name
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create trigger to auto-create config for new seasons
    this.addSql(`
      DROP TRIGGER IF EXISTS trg_create_points_config_for_season ON seasons;
      CREATE TRIGGER trg_create_points_config_for_season
        AFTER INSERT ON seasons
        FOR EACH ROW
        EXECUTE FUNCTION create_default_points_configuration();
    `);
  }

  async down(): Promise<void> {
    // Drop trigger and function
    this.addSql('DROP TRIGGER IF EXISTS trg_create_points_config_for_season ON seasons;');
    this.addSql('DROP FUNCTION IF EXISTS create_default_points_configuration();');

    // Drop RLS policies
    this.addSql('DROP POLICY IF EXISTS "points_configuration_delete_policy" ON "points_configuration";');
    this.addSql('DROP POLICY IF EXISTS "points_configuration_update_policy" ON "points_configuration";');
    this.addSql('DROP POLICY IF EXISTS "points_configuration_insert_policy" ON "points_configuration";');
    this.addSql('DROP POLICY IF EXISTS "points_configuration_select_policy" ON "points_configuration";');

    // Drop table
    this.addSql('DROP TABLE IF EXISTS "points_configuration" CASCADE;');
  }
}
