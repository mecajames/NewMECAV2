-- Create Seasons and Competition Classes System
-- This migration creates the infrastructure for managing competition seasons and classes

-- =====================================================
-- 1. CREATE SEASONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  is_next BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_year CHECK (year >= 2020 AND year <= 2100),
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT unique_current CHECK (
    (is_current = true AND is_next = false) OR
    (is_current = false AND is_next = true) OR
    (is_current = false AND is_next = false)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seasons_year ON seasons(year DESC);
CREATE INDEX IF NOT EXISTS idx_seasons_current ON seasons(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_seasons_next ON seasons(is_next) WHERE is_next = true;
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(start_date, end_date);

-- Enable RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Anyone can read seasons
CREATE POLICY "Allow public read access to seasons"
  ON seasons
  FOR SELECT
  USING (true);

-- Only admins can manage seasons
CREATE POLICY "Allow admins to manage seasons"
  ON seasons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 2. CREATE COMPETITION CLASSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS competition_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('SPL', 'SQL', 'Show and Shine', 'Ride the Light')),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: same abbreviation can't exist twice in same season/format
  CONSTRAINT unique_class_per_season UNIQUE(abbreviation, format, season_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_classes_season ON competition_classes(season_id);
CREATE INDEX IF NOT EXISTS idx_classes_format ON competition_classes(format);
CREATE INDEX IF NOT EXISTS idx_classes_active ON competition_classes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_classes_order ON competition_classes(display_order);

-- Enable RLS
ALTER TABLE competition_classes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active classes
CREATE POLICY "Allow public read access to active classes"
  ON competition_classes
  FOR SELECT
  USING (is_active = true);

-- Admins can read all classes
CREATE POLICY "Allow admins to read all classes"
  ON competition_classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can manage classes
CREATE POLICY "Allow admins to manage classes"
  ON competition_classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 3. ADD SEASON REFERENCES TO EXISTING TABLES
-- =====================================================

-- Add season_id to events table (nullable for backwards compatibility)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS format TEXT CHECK (format IN ('SPL', 'SQL', 'Show and Shine', 'Ride the Light'));

-- Create index for events season filtering
CREATE INDEX IF NOT EXISTS idx_events_season ON events(season_id);
CREATE INDEX IF NOT EXISTS idx_events_format ON events(format);

-- Add season_id and class_id to competition_results table (nullable for backwards compatibility)
ALTER TABLE competition_results
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES competition_classes(id) ON DELETE SET NULL;

-- Create indexes for results filtering
CREATE INDEX IF NOT EXISTS idx_results_season ON competition_results(season_id);
CREATE INDEX IF NOT EXISTS idx_results_class ON competition_results(class_id);

-- =====================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger for seasons
CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for competition_classes
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON competition_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. INSERT DEFAULT DATA (2025 SEASON)
-- =====================================================

-- Insert 2025 season as current
INSERT INTO seasons (year, name, start_date, end_date, is_current, is_next)
VALUES (
  2025,
  '2025 Season',
  '2025-01-01',
  '2025-12-31',
  true,
  false
)
ON CONFLICT (year) DO NOTHING;

-- Insert 2026 season as next
INSERT INTO seasons (year, name, start_date, end_date, is_current, is_next)
VALUES (
  2026,
  '2026 Season',
  '2026-01-01',
  '2026-12-31',
  false,
  true
)
ON CONFLICT (year) DO NOTHING;

-- Get 2025 season ID for inserting classes
DO $$
DECLARE
  season_2025_id UUID;
BEGIN
  SELECT id INTO season_2025_id FROM seasons WHERE year = 2025;

  IF season_2025_id IS NOT NULL THEN
    -- Insert SPL classes for 2025
    INSERT INTO competition_classes (name, abbreviation, format, season_id, display_order) VALUES
    ('Dueling Demos Extreme', 'DDX', 'SPL', season_2025_id, 1),
    ('Dueling Demos MECA Kids', 'DDMK', 'SPL', season_2025_id, 2),
    ('Dueling Demos Modified 1', 'DDM1', 'SPL', season_2025_id, 3),
    ('Dueling Demos Modified 2', 'DDM2', 'SPL', season_2025_id, 4),
    ('Dueling Demos Modified Street', 'DDMS', 'SPL', season_2025_id, 5),
    ('Dueling Demos Motorcycle 1', 'MOTO1', 'SPL', season_2025_id, 6),
    ('Dueling Demos Motorcycle 2', 'MOTO2', 'SPL', season_2025_id, 7),
    ('Dueling Demos Motorcycle 3', 'MOTO3', 'SPL', season_2025_id, 8),
    ('Dueling Demos Open', 'DDO', 'SPL', season_2025_id, 9),
    ('Dueling Demos Street', 'DDS', 'SPL', season_2025_id, 10),
    ('Extreme', 'X', 'SPL', season_2025_id, 11),
    ('MECA Kids Park and Pound', 'MKPNP', 'SPL', season_2025_id, 12),
    ('MECA Kids Sound Pressure', 'MKSP', 'SPL', season_2025_id, 13),
    ('MECA Kids Sound Pressure X', 'MKSPX', 'SPL', season_2025_id, 14),
    ('Modified 1', 'M1', 'SPL', season_2025_id, 15),
    ('Modified 2', 'M2', 'SPL', season_2025_id, 16),
    ('Modified 3', 'M3', 'SPL', season_2025_id, 17),
    ('Modified 4', 'M4', 'SPL', season_2025_id, 18),
    ('Modified 5', 'M5', 'SPL', season_2025_id, 19),
    ('Modified Street 1', 'MS1', 'SPL', season_2025_id, 20),
    ('Modified Street 2', 'MS2', 'SPL', season_2025_id, 21),
    ('Modified Street 3', 'MS3', 'SPL', season_2025_id, 22),
    ('Modified Street 4', 'MS4', 'SPL', season_2025_id, 23),
    ('Park And Pound 1', 'DB1', 'SPL', season_2025_id, 24),
    ('Park and Pound 2', 'DB2', 'SPL', season_2025_id, 25),
    ('Park and Pound 3', 'DB3', 'SPL', season_2025_id, 26),
    ('Park and Pound 4', 'DB4', 'SPL', season_2025_id, 27),
    ('Park and Pound 5', 'DB5', 'SPL', season_2025_id, 28),
    ('Single Position Dueling Demos Extreme', 'SPDDX', 'SPL', season_2025_id, 29),
    ('Single Position Dueling Demos Modified', 'SPDDM', 'SPL', season_2025_id, 30),
    ('Single Position Dueling Demos Street', 'SPDDS', 'SPL', season_2025_id, 31),
    ('Street 1', 'S1', 'SPL', season_2025_id, 32),
    ('Street 2', 'S2', 'SPL', season_2025_id, 33),
    ('Street 3', 'S3', 'SPL', season_2025_id, 34),
    ('Street 4', 'S4', 'SPL', season_2025_id, 35),
    ('Street 5', 'S5', 'SPL', season_2025_id, 36),
    ('Trunk 1', 'T1', 'SPL', season_2025_id, 37),
    ('Trunk 2', 'T2', 'SPL', season_2025_id, 38),
    ('X Modified 1', 'XM1', 'SPL', season_2025_id, 39),
    ('X Modified 2', 'XM2', 'SPL', season_2025_id, 40),
    ('X Modified Street', 'XMS', 'SPL', season_2025_id, 41),
    ('X Street 1', 'XST1', 'SPL', season_2025_id, 42),
    ('X Street 2', 'XST2', 'SPL', season_2025_id, 43),
    ('X Street Trunk', 'XST', 'SPL', season_2025_id, 44)
    ON CONFLICT (abbreviation, format, season_id) DO NOTHING;
  END IF;
END $$;
