-- Migration: Make documents storage bucket public
-- This fixes the issue where images uploaded to the media library are not accessible

-- Create the documents bucket if it doesn't exist and make it public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'video/mp4', 'video/webm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to manage all documents" ON storage.objects;

-- Policy: Allow anyone to read files from the documents bucket (public access)
CREATE POLICY "Allow public read access to documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents');

-- Policy: Allow authenticated users to upload files to the documents bucket
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update their documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid())
WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete their documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());

-- Policy: Allow admins to manage all files in the documents bucket
CREATE POLICY "Allow admins to manage all documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
