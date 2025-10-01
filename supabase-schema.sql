-- Create rulebooks table
CREATE TABLE IF NOT EXISTS rulebooks (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rulebooks_status ON rulebooks(status);
CREATE INDEX IF NOT EXISTS idx_rulebooks_category ON rulebooks(category);
CREATE INDEX IF NOT EXISTS idx_rulebooks_season ON rulebooks(season);

-- Enable Row Level Security
ALTER TABLE rulebooks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active and archived rulebooks
CREATE POLICY "Allow public read access to active and archived rulebooks"
  ON rulebooks
  FOR SELECT
  USING (status IN ('active', 'archive'));

-- Allow admins to do everything
CREATE POLICY "Allow admins full access to rulebooks"
  ON rulebooks
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rulebooks_updated_at
  BEFORE UPDATE ON rulebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
