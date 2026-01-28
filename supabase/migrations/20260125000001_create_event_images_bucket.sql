-- Migration: Create event-images storage bucket
-- This bucket stores event flyer images uploaded by admins and event directors

-- Create the event-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  5242880, -- 5MB (same as other image buckets)
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to event-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to upload event-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to update event-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete event-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow event directors to upload event-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow event directors to update event-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow event directors to delete event-images" ON storage.objects;

-- Policy: Allow anyone to read files from the event-images bucket (public access for displaying flyers)
CREATE POLICY "Allow public read access to event-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

-- Policy: Allow admins to upload files to the event-images bucket
CREATE POLICY "Allow admins to upload event-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Allow admins to update files in the event-images bucket
CREATE POLICY "Allow admins to update event-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Allow admins to delete files from the event-images bucket
CREATE POLICY "Allow admins to delete event-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Allow event directors to upload files to the event-images bucket
CREATE POLICY "Allow event directors to upload event-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'event_director'
  )
);

-- Policy: Allow event directors to update files in the event-images bucket
CREATE POLICY "Allow event directors to update event-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'event_director'
  )
)
WITH CHECK (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'event_director'
  )
);

-- Policy: Allow event directors to delete files from the event-images bucket
CREATE POLICY "Allow event directors to delete event-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'event_director'
  )
);
