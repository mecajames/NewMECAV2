# Supabase Setup Instructions

## 1. Create the Rulebooks Table

Go to your Supabase project at https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep

### Option A: Using SQL Editor
1. Click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** or press `Ctrl+Enter`

### Option B: Using Table Editor (Manual)
1. Click on **Table Editor** in the left sidebar
2. Click **New Table**
3. Set table name: `rulebooks`
4. Add the following columns:

| Column Name  | Type           | Default Value       | Options                    |
|--------------|----------------|---------------------|----------------------------|
| id           | uuid           | gen_random_uuid()   | Primary Key                |
| title        | text           |                     | NOT NULL                   |
| category     | text           |                     | NOT NULL                   |
| season       | text           |                     | NOT NULL                   |
| pdf_url      | text           |                     | NOT NULL                   |
| status       | text           | 'active'            | NOT NULL                   |
| created_at   | timestamptz    | now()               |                            |
| updated_at   | timestamptz    | now()               |                            |
| created_by   | uuid           |                     | Foreign Key to auth.users  |

5. After creating, go to SQL Editor and run the RLS policies from `supabase-schema.sql`

## 2. Create Storage Bucket for PDFs

1. Click on **Storage** in the left sidebar
2. Click **New Bucket**
3. Set bucket name: `documents`
4. **IMPORTANT:** Set bucket to **Public** (so PDFs can be viewed)
5. Click **Create Bucket**

### Set Storage Policies

After creating the bucket, you need to set up policies:

1. Click on the `documents` bucket
2. Click on **Policies** tab
3. Click **New Policy**

#### Policy 1: Public Read Access
```sql
-- Allow anyone to read files
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');
```

#### Policy 2: Admin Upload Access
```sql
-- Allow admins to upload files
CREATE POLICY "Allow admins to upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
```

#### Policy 3: Admin Delete Access
```sql
-- Allow admins to delete files
CREATE POLICY "Allow admins to delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
```

## 3. Verify Setup

1. Go to **Table Editor** and verify the `rulebooks` table exists
2. Go to **Storage** and verify the `documents` bucket exists and is public
3. Go to **SQL Editor** and run:
```sql
SELECT * FROM rulebooks;
```
Should return empty results (no errors)

## 4. Test Upload (Optional)

1. Log in to your app as an admin user
2. Go to Dashboard → Manage Rulebooks
3. Try uploading a test PDF
4. Verify it appears in Storage → documents folder
5. Verify the record appears in Table Editor → rulebooks

## Troubleshooting

### "permission denied for table rulebooks"
- Check that RLS policies are set up correctly
- Verify your user has role='admin' in the profiles table

### "Failed to upload PDF"
- Check that the `documents` bucket is public
- Verify storage policies are set up
- Check browser console for specific error messages

### PDFs not loading
- Verify bucket is set to public
- Check the pdf_url in the rulebooks table is correct
- Try accessing the URL directly in a browser
