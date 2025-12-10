import { Migration } from '@mikro-orm/migrations';

export class Migration20251208100000_create_profile_images_bucket extends Migration {
  async up(): Promise<void> {
    // Create the profile-images storage bucket if it doesn't exist
    this.addSql(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create storage policy to allow authenticated users to upload to their own folder
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own profile images'
        ) THEN
          CREATE POLICY "Users can upload their own profile images"
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = 'profile-images' AND
            (storage.foldername(name))[1] = auth.uid()::text
          );
        END IF;
      END $$;
    `);

    // Policy for team-logos folder (captain uploads)
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload team logos'
        ) THEN
          CREATE POLICY "Users can upload team logos"
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = 'profile-images' AND
            (storage.foldername(name))[1] = 'team-logos'
          );
        END IF;
      END $$;
    `);

    // Policy for team-gallery folder
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload team gallery images'
        ) THEN
          CREATE POLICY "Users can upload team gallery images"
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = 'profile-images' AND
            (storage.foldername(name))[1] = 'team-gallery'
          );
        END IF;
      END $$;
    `);

    // Allow public read access to all profile images
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Public can view profile images'
        ) THEN
          CREATE POLICY "Public can view profile images"
          ON storage.objects FOR SELECT
          TO public
          USING (bucket_id = 'profile-images');
        END IF;
      END $$;
    `);

    // Allow users to delete their own images
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own profile images'
        ) THEN
          CREATE POLICY "Users can delete their own profile images"
          ON storage.objects FOR DELETE
          TO authenticated
          USING (
            bucket_id = 'profile-images' AND
            (
              (storage.foldername(name))[1] = auth.uid()::text OR
              (storage.foldername(name))[1] IN ('team-logos', 'team-gallery')
            )
          );
        END IF;
      END $$;
    `);
  }

  async down(): Promise<void> {
    // Remove policies
    this.addSql(`DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can upload team logos" ON storage.objects;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can upload team gallery images" ON storage.objects;`);
    this.addSql(`DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;`);
    // Note: We don't delete the bucket to avoid data loss
  }
}
