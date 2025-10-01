-- Storage policies for the 'documents' bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete files" ON storage.objects;

-- Policy 1: Allow anyone to read/download files from documents bucket
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Policy 2: Allow admins to upload/insert files
CREATE POLICY "Allow admins to upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 3: Allow admins to update files
CREATE POLICY "Allow admins to update files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 4: Allow admins to delete files
CREATE POLICY "Allow admins to delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
