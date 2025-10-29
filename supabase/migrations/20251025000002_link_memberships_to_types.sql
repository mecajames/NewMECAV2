-- =====================================================
-- Link Memberships to Membership Types
-- =====================================================
-- Converts memberships table from using enum to FK reference
-- =====================================================

-- =====================================================
-- 1. ADD MEMBERSHIP_TYPE_ID COLUMN
-- =====================================================

ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS membership_type_id UUID REFERENCES membership_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS member_id UUID;

-- Create index for FK
CREATE INDEX IF NOT EXISTS idx_memberships_membership_type ON memberships(membership_type_id);
CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(member_id);

COMMENT ON COLUMN memberships.membership_type_id IS 'References the membership_types table for the type of membership';
COMMENT ON COLUMN memberships.member_id IS 'Replaces user_id - references the member who owns this membership';

-- =====================================================
-- 2. MIGRATE EXISTING DATA (IF ANY)
-- =====================================================

-- If there's any data with the old enum, convert it
-- annual → Competitor
-- lifetime → Team

DO $$
DECLARE
  competitor_id UUID;
  team_id UUID;
BEGIN
  -- Get membership type IDs
  SELECT id INTO competitor_id FROM membership_types WHERE name = 'Competitor';
  SELECT id INTO team_id FROM membership_types WHERE name = 'Team';

  -- Update existing records (if any exist)
  IF EXISTS (SELECT 1 FROM memberships WHERE membership_type_id IS NULL AND membership_type = 'annual') THEN
    UPDATE memberships
    SET membership_type_id = competitor_id,
        member_id = user_id
    WHERE membership_type = 'annual' AND membership_type_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM memberships WHERE membership_type_id IS NULL AND membership_type = 'lifetime') THEN
    UPDATE memberships
    SET membership_type_id = team_id,
        member_id = user_id
    WHERE membership_type = 'lifetime' AND membership_type_id IS NULL;
  END IF;
END $$;

-- =====================================================
-- 3. DROP OLD COLUMNS (COMMENTED OUT FOR SAFETY)
-- =====================================================

-- Uncomment these after verifying migration worked:
-- ALTER TABLE memberships DROP COLUMN IF EXISTS membership_type;
-- ALTER TABLE memberships DROP COLUMN IF EXISTS user_id;

-- For now, we'll keep both columns to ensure data integrity

-- =====================================================
-- 4. ADD HELPER FUNCTION TO GET USER'S ACTIVE MEMBERSHIP
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_active_membership(p_user_id UUID)
RETURNS TABLE (
  membership_id UUID,
  membership_type_id UUID,
  membership_name TEXT,
  features JSONB,
  status membership_status,
  expiry_date TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS membership_id,
    mt.id AS membership_type_id,
    mt.name AS membership_name,
    mt.features,
    m.status,
    m.expiry_date
  FROM memberships m
  JOIN membership_types mt ON m.membership_type_id = mt.id
  WHERE m.member_id = p_user_id
  AND m.status = 'active'
  ORDER BY m.purchase_date DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_active_membership(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_active_membership IS 'Returns the active membership for a user with all membership type details';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE memberships IS 'User membership records linked to membership_types table. Use member_id (not user_id) and membership_type_id (not membership_type enum).';
