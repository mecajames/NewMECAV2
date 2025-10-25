-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload event images
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

-- Allow public read access to event images
CREATE POLICY "Public read access for event images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Users can update event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-images');

-- Allow authenticated users to delete event images
CREATE POLICY "Users can delete event images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images');
