-- Add relationship_to_master field to memberships table
-- This field helps identify/differentiate secondary memberships (spouse, child, sibling, etc.)

ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS relationship_to_master TEXT;

-- Add comment for documentation
COMMENT ON COLUMN memberships.relationship_to_master IS 'Relationship to master account holder (spouse, child, sibling, parent, friend, other)';
