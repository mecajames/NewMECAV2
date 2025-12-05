-- Update membership_type_configs table schema
-- Adds: tier, show_on_public_site, quickbooks_item_id, quickbooks_account_id
-- Removes: duration column (all memberships are annual now)

-- Create manufacturer_tier enum type
DO $$ BEGIN
  CREATE TYPE manufacturer_tier AS ENUM ('bronze', 'silver', 'gold');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to membership_type_configs
ALTER TABLE membership_type_configs
  ADD COLUMN IF NOT EXISTS tier manufacturer_tier,
  ADD COLUMN IF NOT EXISTS show_on_public_site boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quickbooks_item_id text,
  ADD COLUMN IF NOT EXISTS quickbooks_account_id text;

-- Create index on show_on_public_site
CREATE INDEX IF NOT EXISTS idx_membership_configs_public ON membership_type_configs(show_on_public_site);

-- Drop the duration column if it exists (all memberships are annual)
-- First check if it exists, then drop
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'membership_type_configs' AND column_name = 'duration'
  ) THEN
    ALTER TABLE membership_type_configs DROP COLUMN duration;
  END IF;
END $$;

-- Drop the membership_duration type if it exists
DROP TYPE IF EXISTS membership_duration;

RAISE NOTICE 'Membership type configs schema updated successfully';
