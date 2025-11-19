-- Fix rulebooks table schema to match backend entity

-- Add season column (text, for flexible ranges like "2024-2025")
ALTER TABLE rulebooks ADD COLUMN IF NOT EXISTS season TEXT;

-- Add status column (text)
ALTER TABLE rulebooks ADD COLUMN IF NOT EXISTS status TEXT;

-- Rename file_url to pdf_url if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'rulebooks' AND column_name = 'file_url') THEN
    ALTER TABLE rulebooks RENAME COLUMN file_url TO pdf_url;
  END IF;
END $$;

-- Add created_by column (rename from uploaded_by if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'rulebooks' AND column_name = 'uploaded_by') THEN
    ALTER TABLE rulebooks RENAME COLUMN uploaded_by TO created_by;
  ELSE
    ALTER TABLE rulebooks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Migrate existing data
-- Copy year to season as string (if year column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'rulebooks' AND column_name = 'year') THEN
    UPDATE rulebooks SET season = year::text WHERE season IS NULL;
  END IF;
END $$;

-- Convert is_active to status (if is_active exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'rulebooks' AND column_name = 'is_active') THEN
    UPDATE rulebooks SET status = CASE
      WHEN is_active = true THEN 'active'
      ELSE 'inactive'
    END WHERE status IS NULL;
  END IF;
END $$;

-- Set default status for any remaining NULL values
UPDATE rulebooks SET status = 'active' WHERE status IS NULL;

-- Make new columns NOT NULL after data migration
ALTER TABLE rulebooks ALTER COLUMN season SET NOT NULL;
ALTER TABLE rulebooks ALTER COLUMN status SET NOT NULL;
ALTER TABLE rulebooks ALTER COLUMN status SET DEFAULT 'active';

-- Add index for status
CREATE INDEX IF NOT EXISTS rulebooks_status_idx ON rulebooks(status);

-- Ensure pdf_url is set correctly
ALTER TABLE rulebooks ALTER COLUMN pdf_url SET NOT NULL;
