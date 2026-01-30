import { Migration } from '@mikro-orm/migrations';

export class Migration20260116100000 extends Migration {
  async up(): Promise<void> {
    // ==========================================================================
    // Create banner-images storage bucket
    // ==========================================================================
    this.addSql(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'banner-images',
        'banner-images',
        true,
        5242880,
        ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Storage policy for public read access
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'banner_images_public_read'
        ) THEN
          CREATE POLICY "banner_images_public_read" ON storage.objects
            FOR SELECT
            USING (bucket_id = 'banner-images');
        END IF;
      END $$;
    `);

    // Storage policy for admin uploads
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'banner_images_admin_insert'
        ) THEN
          CREATE POLICY "banner_images_admin_insert" ON storage.objects
            FOR INSERT
            WITH CHECK (
              bucket_id = 'banner-images'
              AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
              )
            );
        END IF;
      END $$;
    `);

    // Storage policy for admin updates
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'banner_images_admin_update'
        ) THEN
          CREATE POLICY "banner_images_admin_update" ON storage.objects
            FOR UPDATE
            USING (
              bucket_id = 'banner-images'
              AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
              )
            );
        END IF;
      END $$;
    `);

    // Storage policy for admin deletes
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'banner_images_admin_delete'
        ) THEN
          CREATE POLICY "banner_images_admin_delete" ON storage.objects
            FOR DELETE
            USING (
              bucket_id = 'banner-images'
              AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
              )
            );
        END IF;
      END $$;
    `);

    // ==========================================================================
    // Add frequency capping columns to banners table
    // ==========================================================================

    // Max impressions per user (0 = unlimited)
    this.addSql(`
      ALTER TABLE "banners"
      ADD COLUMN IF NOT EXISTS "max_impressions_per_user" integer NOT NULL DEFAULT 0;
    `);

    // Max total impressions for the campaign (0 = unlimited)
    this.addSql(`
      ALTER TABLE "banners"
      ADD COLUMN IF NOT EXISTS "max_total_impressions" integer NOT NULL DEFAULT 0;
    `);

    // Rotation weight - higher = more likely to be shown (default 100)
    this.addSql(`
      ALTER TABLE "banners"
      ADD COLUMN IF NOT EXISTS "rotation_weight" integer NOT NULL DEFAULT 100;
    `);

    // Add comments for documentation
    this.addSql(`
      COMMENT ON COLUMN "banners"."max_impressions_per_user" IS 'Maximum times to show this banner to the same user. 0 = unlimited.';
    `);
    this.addSql(`
      COMMENT ON COLUMN "banners"."max_total_impressions" IS 'Maximum total impressions across all users. 0 = unlimited.';
    `);
    this.addSql(`
      COMMENT ON COLUMN "banners"."rotation_weight" IS 'Weight for rotation when multiple banners compete. Higher = more likely to be shown.';
    `);
  }

  async down(): Promise<void> {
    // Remove frequency capping columns
    this.addSql(`ALTER TABLE "banners" DROP COLUMN IF EXISTS "max_impressions_per_user";`);
    this.addSql(`ALTER TABLE "banners" DROP COLUMN IF EXISTS "max_total_impressions";`);
    this.addSql(`ALTER TABLE "banners" DROP COLUMN IF EXISTS "rotation_weight";`);

    // Remove storage policies
    this.addSql(`DROP POLICY IF EXISTS "banner_images_public_read" ON storage.objects;`);
    this.addSql(`DROP POLICY IF EXISTS "banner_images_admin_insert" ON storage.objects;`);
    this.addSql(`DROP POLICY IF EXISTS "banner_images_admin_update" ON storage.objects;`);
    this.addSql(`DROP POLICY IF EXISTS "banner_images_admin_delete" ON storage.objects;`);

    // Remove storage bucket
    this.addSql(`DELETE FROM storage.buckets WHERE id = 'banner-images';`);
  }
}
