import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Achievements System
 *
 * This migration creates the infrastructure for the MECA Achievements system:
 * - Achievement definitions (dB clubs, points clubs)
 * - Achievement recipients tracking
 * - Achievement templates for image generation
 * - Seed data for initial dB club achievements
 */
export class Migration20260105000000 extends Migration {
  async up(): Promise<void> {
    // =============================================================================
    // STEP 1: Create ENUM types
    // =============================================================================

    // Achievement Metric Type (score vs points)
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_metric_type') THEN
          CREATE TYPE achievement_metric_type AS ENUM ('score', 'points');
        END IF;
      END$$;
    `);

    // Threshold Operator
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'threshold_operator') THEN
          CREATE TYPE threshold_operator AS ENUM ('>', '>=', '=', '<', '<=');
        END IF;
      END$$;
    `);

    // Achievement Format
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'achievement_format') THEN
          CREATE TYPE achievement_format AS ENUM ('SPL', 'SQL');
        END IF;
      END$$;
    `);

    // =============================================================================
    // STEP 2: Create Achievement Definitions Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "achievement_definitions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "template_key" varchar(100) NOT NULL,
        "format" achievement_format,
        "competition_type" varchar(100) NOT NULL,
        "metric_type" achievement_metric_type NOT NULL,
        "threshold_value" decimal(10,2) NOT NULL,
        "threshold_operator" threshold_operator NOT NULL DEFAULT '>=',
        "class_filter" text[],
        "division_filter" text[],
        "points_multiplier" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes for achievement_definitions
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_achievement_definitions_format" ON "achievement_definitions"("format");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_achievement_definitions_competition_type" ON "achievement_definitions"("competition_type");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_achievement_definitions_is_active" ON "achievement_definitions"("is_active");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_achievement_definitions_threshold" ON "achievement_definitions"("threshold_value" DESC);`);

    // =============================================================================
    // STEP 3: Create Achievement Recipients Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "achievement_recipients" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "achievement_id" uuid NOT NULL REFERENCES "achievement_definitions"("id") ON DELETE CASCADE,
        "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
        "meca_id" varchar(50),
        "achieved_value" decimal(10,2) NOT NULL,
        "achieved_at" timestamptz NOT NULL DEFAULT NOW(),
        "competition_result_id" uuid,
        "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
        "season_id" uuid REFERENCES "seasons"("id") ON DELETE SET NULL,
        "image_url" varchar(500),
        "image_generated_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE("achievement_id", "profile_id")
      );
    `);

    // Indexes for achievement_recipients
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_achievement_recipients_achievement_id" ON "achievement_recipients"("achievement_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_achievement_recipients_profile_id" ON "achievement_recipients"("profile_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_achievement_recipients_meca_id" ON "achievement_recipients"("meca_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_achievement_recipients_achieved_at" ON "achievement_recipients"("achieved_at" DESC);`);

    // =============================================================================
    // STEP 4: Create Achievement Templates Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "achievement_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(100) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "base_image_path" varchar(500) NOT NULL,
        "font_size" integer NOT NULL DEFAULT 500,
        "text_x" integer NOT NULL,
        "text_y" integer NOT NULL,
        "text_color" varchar(20) NOT NULL DEFAULT '#CC0F00',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    // =============================================================================
    // STEP 5: Seed Achievement Templates (from PHP config)
    // =============================================================================

    this.addSql(`
      INSERT INTO "achievement_templates" ("key", "name", "base_image_path", "font_size", "text_x", "text_y", "text_color")
      VALUES
        ('certified-at-the-headrest.v1', 'Certified at the Headrest V1', 'v1.cath.png', 500, 150, 1350, '#CC0F00'),
        ('radicalx.v1', 'Radical X V1', 'v1.radx.png', 500, 170, 1350, '#CC0F00'),
        ('dueling-demos.v1', 'Dueling Demos V1', 'v1.dd.png', 500, 130, 1350, '#CC0F00'),
        ('dueling-demos.certified-360-sound.v1', 'Dueling Demos Certified 360 Sound V1', 'v1.dd.c360s.png', 250, 40, 640, '#CC0F00'),
        ('certified-sound.v1', 'Certified Sound V1', 'v1.cs.png', 500, 130, 1350, '#CC0F00'),
        ('park-pound.v1', 'Park and Pound V1', 'v1.pp.png', 500, 150, 1350, '#CC0F00')
      ON CONFLICT ("key") DO NOTHING;
    `);

    // =============================================================================
    // STEP 6: Seed Achievement Definitions (dB Clubs)
    // =============================================================================

    // Certified at the Headrest dB Clubs (130, 140, 150, 160, 170)
    this.addSql(`
      INSERT INTO "achievement_definitions" ("name", "description", "template_key", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('130 dB Club - Certified at the Headrest', 'Achieved 130+ dB in Certified at the Headrest competition', 'certified-at-the-headrest.v1', 'SPL', 'Certified at the Headrest', 'score', 130.00, '>=', 1),
        ('140 dB Club - Certified at the Headrest', 'Achieved 140+ dB in Certified at the Headrest competition', 'certified-at-the-headrest.v1', 'SPL', 'Certified at the Headrest', 'score', 140.00, '>=', 2),
        ('150 dB Club - Certified at the Headrest', 'Achieved 150+ dB in Certified at the Headrest competition', 'certified-at-the-headrest.v1', 'SPL', 'Certified at the Headrest', 'score', 150.00, '>=', 3),
        ('160 dB Club - Certified at the Headrest', 'Achieved 160+ dB in Certified at the Headrest competition', 'certified-at-the-headrest.v1', 'SPL', 'Certified at the Headrest', 'score', 160.00, '>=', 4),
        ('170 dB Club - Certified at the Headrest', 'Achieved 170+ dB in Certified at the Headrest competition', 'certified-at-the-headrest.v1', 'SPL', 'Certified at the Headrest', 'score', 170.00, '>=', 5)
      ON CONFLICT DO NOTHING;
    `);

    // Radical X dB Clubs (130, 140, 150, 160, 170)
    this.addSql(`
      INSERT INTO "achievement_definitions" ("name", "description", "template_key", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('130 dB Club - Radical X', 'Achieved 130+ dB in Radical X competition', 'radicalx.v1', 'SPL', 'Radical X', 'score', 130.00, '>=', 10),
        ('140 dB Club - Radical X', 'Achieved 140+ dB in Radical X competition', 'radicalx.v1', 'SPL', 'Radical X', 'score', 140.00, '>=', 11),
        ('150 dB Club - Radical X', 'Achieved 150+ dB in Radical X competition', 'radicalx.v1', 'SPL', 'Radical X', 'score', 150.00, '>=', 12),
        ('160 dB Club - Radical X', 'Achieved 160+ dB in Radical X competition', 'radicalx.v1', 'SPL', 'Radical X', 'score', 160.00, '>=', 13),
        ('170 dB Club - Radical X', 'Achieved 170+ dB in Radical X competition', 'radicalx.v1', 'SPL', 'Radical X', 'score', 170.00, '>=', 14)
      ON CONFLICT DO NOTHING;
    `);

    // Park and Pound dB Clubs (130, 140, 150, 160, 170)
    this.addSql(`
      INSERT INTO "achievement_definitions" ("name", "description", "template_key", "format", "competition_type", "metric_type", "threshold_value", "threshold_operator", "display_order")
      VALUES
        ('130 dB Club - Park and Pound', 'Achieved 130+ dB in Park and Pound competition', 'park-pound.v1', 'SPL', 'Park and Pound', 'score', 130.00, '>=', 20),
        ('140 dB Club - Park and Pound', 'Achieved 140+ dB in Park and Pound competition', 'park-pound.v1', 'SPL', 'Park and Pound', 'score', 140.00, '>=', 21),
        ('150 dB Club - Park and Pound', 'Achieved 150+ dB in Park and Pound competition', 'park-pound.v1', 'SPL', 'Park and Pound', 'score', 150.00, '>=', 22),
        ('160 dB Club - Park and Pound', 'Achieved 160+ dB in Park and Pound competition', 'park-pound.v1', 'SPL', 'Park and Pound', 'score', 160.00, '>=', 23),
        ('170 dB Club - Park and Pound', 'Achieved 170+ dB in Park and Pound competition', 'park-pound.v1', 'SPL', 'Park and Pound', 'score', 170.00, '>=', 24)
      ON CONFLICT DO NOTHING;
    `);

    // =============================================================================
    // STEP 7: Add RLS policies
    // =============================================================================

    // Enable RLS on tables
    this.addSql(`ALTER TABLE "achievement_definitions" ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE "achievement_recipients" ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE "achievement_templates" ENABLE ROW LEVEL SECURITY;`);

    // Achievement definitions - public read, admin write
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'achievement_definitions_select_all') THEN
          CREATE POLICY "achievement_definitions_select_all" ON "achievement_definitions"
            FOR SELECT USING (true);
        END IF;
      END$$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'achievement_definitions_admin_all') THEN
          CREATE POLICY "achievement_definitions_admin_all" ON "achievement_definitions"
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
              )
            );
        END IF;
      END$$;
    `);

    // Achievement recipients - public read for image display, admin write
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'achievement_recipients_select_all') THEN
          CREATE POLICY "achievement_recipients_select_all" ON "achievement_recipients"
            FOR SELECT USING (true);
        END IF;
      END$$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'achievement_recipients_admin_all') THEN
          CREATE POLICY "achievement_recipients_admin_all" ON "achievement_recipients"
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
              )
            );
        END IF;
      END$$;
    `);

    // Achievement templates - public read, admin write
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'achievement_templates_select_all') THEN
          CREATE POLICY "achievement_templates_select_all" ON "achievement_templates"
            FOR SELECT USING (true);
        END IF;
      END$$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'achievement_templates_admin_all') THEN
          CREATE POLICY "achievement_templates_admin_all" ON "achievement_templates"
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
              )
            );
        END IF;
      END$$;
    `);

    // =============================================================================
    // STEP 8: Create Supabase storage bucket for achievement images
    // =============================================================================

    this.addSql(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'achievement-images',
        'achievement-images',
        true,
        5242880,
        ARRAY['image/png', 'image/jpeg', 'image/webp']
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Storage policy for public read access
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'achievement_images_public_read' AND tablename = 'objects') THEN
          CREATE POLICY "achievement_images_public_read" ON storage.objects
            FOR SELECT
            USING (bucket_id = 'achievement-images');
        END IF;
      END$$;
    `);

    // Storage policy for authenticated uploads (service role will handle actual uploads)
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'achievement_images_admin_insert' AND tablename = 'objects') THEN
          CREATE POLICY "achievement_images_admin_insert" ON storage.objects
            FOR INSERT
            WITH CHECK (
              bucket_id = 'achievement-images'
              AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
              )
            );
        END IF;
      END$$;
    `);
  }

  async down(): Promise<void> {
    // Drop storage policies
    this.addSql(`DROP POLICY IF EXISTS "achievement_images_admin_insert" ON storage.objects;`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_images_public_read" ON storage.objects;`);

    // Drop storage bucket
    this.addSql(`DELETE FROM storage.buckets WHERE id = 'achievement-images';`);

    // Drop RLS policies
    this.addSql(`DROP POLICY IF EXISTS "achievement_templates_admin_all" ON "achievement_templates";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_templates_select_all" ON "achievement_templates";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_recipients_admin_all" ON "achievement_recipients";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_recipients_select_all" ON "achievement_recipients";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_definitions_admin_all" ON "achievement_definitions";`);
    this.addSql(`DROP POLICY IF EXISTS "achievement_definitions_select_all" ON "achievement_definitions";`);

    // Drop tables in reverse order
    this.addSql(`DROP TABLE IF EXISTS "achievement_templates";`);
    this.addSql(`DROP TABLE IF EXISTS "achievement_recipients";`);
    this.addSql(`DROP TABLE IF EXISTS "achievement_definitions";`);

    // Drop enum types
    this.addSql(`DROP TYPE IF EXISTS achievement_format;`);
    this.addSql(`DROP TYPE IF EXISTS threshold_operator;`);
    this.addSql(`DROP TYPE IF EXISTS achievement_metric_type;`);
  }
}
