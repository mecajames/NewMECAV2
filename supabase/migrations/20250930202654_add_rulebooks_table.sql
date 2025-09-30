/*
  # Add Rulebooks Table

  ## New Tables
  
  ### `rulebooks`
  Rulebook documents and PDF files
  - `id` (uuid, PK)
  - `title` (text) - Rulebook title (e.g., "2025 MECA SPL Rule Book")
  - `description` (text) - Brief description or summary
  - `year` (integer) - Competition year
  - `category` (text) - SPL, SQL, Show N Shine, etc.
  - `pdf_url` (text) - URL to the PDF file
  - `summary_points` (jsonb) - Key points as JSON array
  - `is_active` (boolean) - Whether this is the current rulebook
  - `display_order` (integer) - Display order
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Public can view rulebooks
  - Only admins can create/update rulebooks
*/

CREATE TABLE IF NOT EXISTS rulebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  year integer NOT NULL,
  category text NOT NULL,
  pdf_url text NOT NULL,
  summary_points jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS rulebooks_year_idx ON rulebooks(year DESC);
CREATE INDEX IF NOT EXISTS rulebooks_category_idx ON rulebooks(category);
CREATE INDEX IF NOT EXISTS rulebooks_active_idx ON rulebooks(is_active);

ALTER TABLE rulebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rulebooks are viewable by everyone"
  ON rulebooks FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can create rulebooks"
  ON rulebooks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update rulebooks"
  ON rulebooks FOR UPDATE
  TO authenticated
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

CREATE TRIGGER update_rulebooks_updated_at BEFORE UPDATE ON rulebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();