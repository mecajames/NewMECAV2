-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS rulebooks CASCADE;

-- Create rulebooks table
CREATE TABLE rulebooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'SPL Rulebook',
    'SQL Rulebook',
    'MECA Kids',
    'Dueling Demos',
    'Show and Shine',
    'Ride the Light'
  )),
  season TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archive')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX idx_rulebooks_status ON rulebooks(status);
CREATE INDEX idx_rulebooks_category ON rulebooks(category);
CREATE INDEX idx_rulebooks_season ON rulebooks(season);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_rulebooks_updated_at
  BEFORE UPDATE ON rulebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE rulebooks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to active and archived rulebooks" ON rulebooks;
DROP POLICY IF EXISTS "Allow admins full access to rulebooks" ON rulebooks;

-- Policy 1: Allow anyone to read active and archived rulebooks
CREATE POLICY "Allow public read access to active and archived rulebooks"
  ON rulebooks
  FOR SELECT
  USING (status IN ('active', 'archive'));

-- Policy 2: Allow admins full access (read, insert, update, delete)
CREATE POLICY "Allow admins full access to rulebooks"
  ON rulebooks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON rulebooks TO authenticated;
GRANT SELECT ON rulebooks TO anon;
