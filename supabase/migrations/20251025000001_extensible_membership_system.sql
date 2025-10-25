-- =====================================================
-- Extensible Membership System Enhancement
-- =====================================================
-- This migration adds extensibility to the membership system:
-- - JSONB features for flexible membership configuration
-- - System admin vs admin distinction
-- - Banner and advertising system
-- - Directory listings for retailers/manufacturers
-- - Team ownership and competition preferences
-- - Additional permissions for future scalability
-- =====================================================

-- =====================================================
-- 1. EXTEND MEMBERSHIP TYPES WITH FLEXIBLE FEATURES
-- =====================================================

-- Add extensible columns to membership_types
ALTER TABLE membership_types
ADD COLUMN IF NOT EXISTS can_own_team BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_join_teams BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS listed_in_directory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS directory_type TEXT CHECK (directory_type IN ('retail', 'manufacturer', NULL)),
ADD COLUMN IF NOT EXISTS has_banner_carousel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banner_ad_slots INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_team_members INTEGER,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index on JSONB columns for efficient querying
CREATE INDEX IF NOT EXISTS idx_membership_types_features ON membership_types USING gin(features);
CREATE INDEX IF NOT EXISTS idx_membership_types_metadata ON membership_types USING gin(metadata);

COMMENT ON COLUMN membership_types.features IS 'Flexible JSONB field for custom features. Example: {"custom_badge": true, "priority_support": true, "api_access": true}';
COMMENT ON COLUMN membership_types.metadata IS 'Flexible JSONB field for additional metadata. Example: {"color_theme": "#ff0000", "icon": "crown", "badge_url": "..."}';

-- Update existing membership types with appropriate features
UPDATE membership_types SET
  can_own_team = false,
  can_join_teams = true,
  features = '{"meca_id": true, "event_registration": true}'::jsonb
WHERE name = 'Competitor';

UPDATE membership_types SET
  can_own_team = true,
  can_join_teams = true,
  max_team_members = 10,
  features = '{"meca_id": true, "event_registration": true, "team_ownership": true, "custom_team_name": true}'::jsonb
WHERE name = 'Team';

UPDATE membership_types SET
  can_own_team = true,
  can_join_teams = true,
  listed_in_directory = true,
  directory_type = 'retail',
  has_banner_carousel = true,
  banner_ad_slots = 1,
  features = '{"meca_id": true, "event_registration": true, "directory_listing": true, "banner_carousel": true}'::jsonb
WHERE name = 'Retailer';

UPDATE membership_types SET
  can_own_team = true,
  can_join_teams = true,
  listed_in_directory = true,
  directory_type = 'manufacturer',
  has_banner_carousel = true,
  banner_ad_slots = 3,
  features = '{"meca_id": true, "event_registration": true, "directory_listing": true, "banner_carousel": true, "banner_ads": 3}'::jsonb
WHERE name LIKE 'Manufacturer%';

-- =====================================================
-- 2. ADD SYSTEM ADMIN ROLE
-- =====================================================

-- Add system_admin to user_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'system_admin') THEN

    ALTER TYPE user_role ADD VALUE 'system_admin';
  END IF;
END $$;

COMMENT ON TYPE user_role IS 'User roles: user (basic member), event_director (can manage events), retailer (business member), admin (content/user management), system_admin (full system access including settings/configuration)';

-- =====================================================
-- 3. ADD TEAM OWNERSHIP & COMPETITION PREFERENCES TO PROFILES
-- =====================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS owned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS compete_as TEXT DEFAULT 'individual' CHECK (compete_as IN ('individual', 'team')),
ADD COLUMN IF NOT EXISTS compete_as_last_changed_season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;

-- Create indexes for team-related queries
CREATE INDEX IF NOT EXISTS idx_profiles_owned_team ON profiles(owned_team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_compete_as_season ON profiles(compete_as_last_changed_season_id);

COMMENT ON COLUMN profiles.owned_team_id IS 'For Team membership holders - the team they own (not just member of)';
COMMENT ON COLUMN profiles.compete_as IS 'Whether member competes as individual or under team name';
COMMENT ON COLUMN profiles.compete_as_last_changed_season_id IS 'Season when compete_as preference was last changed (locked to once per season)';

-- =====================================================
-- 4. CREATE BANNER IMAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS banner_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  banner_type TEXT NOT NULL CHECK (banner_type IN ('carousel', 'header', 'sidebar', 'footer')),
  position INTEGER DEFAULT 0,
  link_url TEXT,
  alt_text TEXT,
  active BOOLEAN DEFAULT true,
  display_start_date TIMESTAMPTZ,
  display_end_date TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for banner queries
CREATE INDEX IF NOT EXISTS idx_banner_images_owner ON banner_images(owner_id);
CREATE INDEX IF NOT EXISTS idx_banner_images_type ON banner_images(banner_type);
CREATE INDEX IF NOT EXISTS idx_banner_images_active ON banner_images(active);
CREATE INDEX IF NOT EXISTS idx_banner_images_position ON banner_images(position);

-- Trigger for updated_at
CREATE TRIGGER update_banner_images_updated_at
BEFORE UPDATE ON banner_images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE banner_images IS 'Banner images for carousel display on homepage. Retailers get 1 slot, Manufacturers get 1 carousel slot.';
COMMENT ON COLUMN banner_images.metadata IS 'Flexible JSONB for additional data like targeting, A/B test variants, etc.';

-- =====================================================
-- 5. CREATE MANUFACTURER ADS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS manufacturer_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ad_slot INTEGER NOT NULL CHECK (ad_slot BETWEEN 1 AND 3),
  ad_placement TEXT NOT NULL CHECK (ad_placement IN ('header', 'sidebar', 'footer', 'inline')),
  image_url TEXT NOT NULL,
  link_url TEXT,
  alt_text TEXT,
  active BOOLEAN DEFAULT true,
  display_start_date TIMESTAMPTZ,
  display_end_date TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(manufacturer_id, ad_slot)
);

-- Indexes for manufacturer ads
CREATE INDEX IF NOT EXISTS idx_manufacturer_ads_manufacturer ON manufacturer_ads(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_manufacturer_ads_placement ON manufacturer_ads(ad_placement);
CREATE INDEX IF NOT EXISTS idx_manufacturer_ads_active ON manufacturer_ads(active);

-- Trigger for updated_at
CREATE TRIGGER update_manufacturer_ads_updated_at
BEFORE UPDATE ON manufacturer_ads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE manufacturer_ads IS 'Manufacturer members get 3 banner ad slots displayed across the website in various placements.';

-- =====================================================
-- 6. CREATE DIRECTORY LISTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS directory_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  directory_type TEXT NOT NULL CHECK (directory_type IN ('retail', 'manufacturer')),
  business_name TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'USA',
  social_links JSONB DEFAULT '{}',
  business_hours JSONB DEFAULT '{}',
  featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for directory queries
CREATE INDEX IF NOT EXISTS idx_directory_listings_profile ON directory_listings(profile_id);
CREATE INDEX IF NOT EXISTS idx_directory_listings_type ON directory_listings(directory_type);
CREATE INDEX IF NOT EXISTS idx_directory_listings_active ON directory_listings(active);
CREATE INDEX IF NOT EXISTS idx_directory_listings_featured ON directory_listings(featured);
CREATE INDEX IF NOT EXISTS idx_directory_listings_display_order ON directory_listings(display_order);

-- Trigger for updated_at
CREATE TRIGGER update_directory_listings_updated_at
BEFORE UPDATE ON directory_listings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE directory_listings IS 'Public directory for Retailer and Manufacturer members. Automatically created when purchasing those membership types.';
COMMENT ON COLUMN directory_listings.social_links IS 'JSONB object with social media links. Example: {"facebook": "...", "instagram": "...", "twitter": "..."}';
COMMENT ON COLUMN directory_listings.business_hours IS 'JSONB object with operating hours. Example: {"monday": "9am-5pm", "tuesday": "9am-5pm", ...}';
COMMENT ON COLUMN directory_listings.metadata IS 'Extensible JSONB for future directory features like certifications, specialties, etc.';

-- =====================================================
-- 7. ADD NEW PERMISSIONS FOR EXTENSIBILITY
-- =====================================================

-- Insert new permissions
INSERT INTO permissions (name, description, category) VALUES
  -- System-level permissions (only for system_admin)
  ('access_system_settings', 'Access system configuration and settings', 'system'),
  ('access_system_configuration', 'Modify core system configuration', 'system'),
  ('manage_membership_types', 'Create, edit, and delete membership types', 'system'),
  ('manage_database', 'Access database management tools', 'system'),

  -- Event director specific permissions
  ('request_event', 'Request to add new events to the system', 'events'),
  ('manage_event_results', 'Enter and manage results for completed events', 'events'),

  -- Directory and banner permissions
  ('manage_directory_listings', 'Manage directory listings', 'content'),
  ('manage_banner_ads', 'Manage banner advertisements', 'content'),

  -- Team permissions
  ('manage_teams', 'Manage team structures and memberships', 'users'),

  -- Future-proof permissions (examples of extensibility)
  ('access_api', 'Access API endpoints for integrations', 'system'),
  ('view_analytics', 'View system analytics and reports', 'content'),
  ('manage_seasons', 'Manage competition seasons', 'competition'),
  ('manage_classes', 'Manage competition classes', 'competition')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. UPDATE PERMISSION CHECK FUNCTION FOR SYSTEM_ADMIN
-- =====================================================

-- Update permission check function to handle system_admin
CREATE OR REPLACE FUNCTION check_user_permission(p_user_id UUID, p_permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role user_role;
  has_permission BOOLEAN;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM profiles WHERE id = p_user_id;

  -- If user is system_admin, always return true (full access)
  IF user_role = 'system_admin' THEN
    RETURN TRUE;
  END IF;

  -- If user is admin, return true for all EXCEPT system-level permissions
  IF user_role = 'admin' THEN
    IF p_permission_name IN ('access_system_settings', 'access_system_configuration', 'manage_membership_types', 'manage_database') THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  -- Check if permission is explicitly denied via override
  IF EXISTS (
    SELECT 1 FROM user_permission_overrides upo
    JOIN permissions p ON upo.permission_id = p.id
    WHERE upo.user_id = p_user_id
    AND p.name = p_permission_name
    AND upo.granted = false
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if permission is explicitly granted via override
  IF EXISTS (
    SELECT 1 FROM user_permission_overrides upo
    JOIN permissions p ON upo.permission_id = p.id
    WHERE upo.user_id = p_user_id
    AND p.name = p_permission_name
    AND upo.granted = true
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check role permissions
  IF EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = user_role
    AND p.name = p_permission_name
  ) THEN
    RETURN TRUE;
  END IF;

  -- Default: no permission
  RETURN FALSE;
END;
$$;

-- =====================================================
-- 9. ASSIGN PERMISSIONS TO ROLES
-- =====================================================

-- Event director gets event-related permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'event_director', id FROM permissions WHERE name IN (
  'request_event', 'manage_event_results'
)
ON CONFLICT DO NOTHING;

-- Note: system_admin automatically gets ALL permissions via check function
-- Note: admin gets all permissions EXCEPT system-level ones via check function

-- =====================================================
-- 10. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE banner_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_listings ENABLE ROW LEVEL SECURITY;

-- Banner images policies
CREATE POLICY "Anyone can view active banners" ON banner_images FOR SELECT
  USING (active = true);

CREATE POLICY "Owners can manage own banners" ON banner_images FOR ALL
  USING (owner_id = auth.uid() OR check_user_permission(auth.uid(), 'manage_banner_ads'));

-- Manufacturer ads policies
CREATE POLICY "Anyone can view active manufacturer ads" ON manufacturer_ads FOR SELECT
  USING (active = true);

CREATE POLICY "Manufacturers can manage own ads" ON manufacturer_ads FOR ALL
  USING (manufacturer_id = auth.uid() OR check_user_permission(auth.uid(), 'manage_banner_ads'));

-- Directory listings policies
CREATE POLICY "Anyone can view active directory listings" ON directory_listings FOR SELECT
  USING (active = true);

CREATE POLICY "Profile owners can manage own listing" ON directory_listings FOR ALL
  USING (profile_id = auth.uid() OR check_user_permission(auth.uid(), 'manage_directory_listings'));

-- =====================================================
-- 11. CREATE HELPER FUNCTIONS FOR EXTENSIBILITY
-- =====================================================

-- Function to check if user can change compete_as preference
CREATE OR REPLACE FUNCTION can_change_compete_as(p_user_id UUID, p_current_season_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  last_changed_season_id UUID;
BEGIN
  SELECT compete_as_last_changed_season_id INTO last_changed_season_id
  FROM profiles
  WHERE id = p_user_id;

  -- If never changed or changed in a different season, allow change
  IF last_changed_season_id IS NULL OR last_changed_season_id != p_current_season_id THEN
    RETURN TRUE;
  END IF;

  -- Already changed this season, deny
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION can_change_compete_as(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION can_change_compete_as IS 'Checks if user can change their compete_as preference (only once per season)';

-- Function to get membership type features
CREATE OR REPLACE FUNCTION get_membership_features(p_membership_type_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  features_json JSONB;
BEGIN
  SELECT features INTO features_json
  FROM membership_types
  WHERE id = p_membership_type_id;

  RETURN COALESCE(features_json, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_membership_features(UUID) TO authenticated;

COMMENT ON FUNCTION get_membership_features IS 'Returns the features JSONB for a membership type. Useful for checking feature flags.';

-- Function to check if user has specific membership feature
CREATE OR REPLACE FUNCTION user_has_membership_feature(p_user_id UUID, p_feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  has_feature BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM memberships m
    JOIN membership_types mt ON m.membership_type_id = mt.id
    WHERE m.member_id = p_user_id
    AND m.status = 'active'
    AND mt.features ? p_feature_name
    AND (mt.features->p_feature_name)::boolean = true
  ) INTO has_feature;

  RETURN has_feature;
END;
$$;

GRANT EXECUTE ON FUNCTION user_has_membership_feature(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION user_has_membership_feature IS 'Checks if user has an active membership with a specific feature flag enabled.';

-- =====================================================
-- 12. CREATE AUDIT LOG TABLE (FOR EXTENSIBILITY)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only system admins can view audit logs
CREATE POLICY "System admins can view audit log" ON audit_log FOR SELECT
  USING (check_user_permission(auth.uid(), 'manage_database'));

COMMENT ON TABLE audit_log IS 'Audit trail for important data changes. Extensible via metadata JSONB.';

-- =====================================================
-- 13. CREATE FEATURE FLAGS TABLE (FOR EXTENSIBILITY)
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  enabled_for_roles user_role[] DEFAULT '{}',
  enabled_for_users UUID[] DEFAULT '{}',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for feature flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON feature_flags
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can view feature flags (to check if feature is enabled)
CREATE POLICY "Anyone can view feature flags" ON feature_flags FOR SELECT
  USING (true);

-- Only system admins can modify feature flags
CREATE POLICY "System admins can manage feature flags" ON feature_flags FOR ALL
  USING (check_user_permission(auth.uid(), 'access_system_settings'));

COMMENT ON TABLE feature_flags IS 'System-wide feature flags for gradual rollouts and A/B testing. Highly extensible via config JSONB.';

-- Function to check if feature is enabled for user
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_name TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  flag_record RECORD;
  user_role_val user_role;
BEGIN
  -- Get feature flag
  SELECT * INTO flag_record FROM feature_flags WHERE flag_name = p_feature_name;

  -- If flag doesn't exist or is disabled globally, return false
  IF flag_record IS NULL OR NOT flag_record.enabled THEN
    RETURN false;
  END IF;

  -- If no user specified, return global enabled status
  IF p_user_id IS NULL THEN
    RETURN flag_record.enabled;
  END IF;

  -- Check if user is in enabled_for_users array
  IF p_user_id = ANY(flag_record.enabled_for_users) THEN
    RETURN true;
  END IF;

  -- Check if user's role is in enabled_for_roles array
  SELECT role INTO user_role_val FROM profiles WHERE id = p_user_id;
  IF user_role_val = ANY(flag_record.enabled_for_roles) THEN
    RETURN true;
  END IF;

  -- Default: feature enabled globally but not specifically for this user
  RETURN flag_record.enabled;
END;
$$;

GRANT EXECUTE ON FUNCTION is_feature_enabled(TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION is_feature_enabled IS 'Checks if a feature flag is enabled globally or for a specific user/role.';

-- =====================================================
-- 14. INSERT SAMPLE FEATURE FLAGS
-- =====================================================

INSERT INTO feature_flags (flag_name, description, enabled, config) VALUES
  ('beta_features', 'Enable beta features for testing', false, '{"rollout_percentage": 0}'::jsonb),
  ('advanced_analytics', 'Advanced analytics dashboard', false, '{"require_membership": "Manufacturer Gold"}'::jsonb),
  ('api_access', 'RESTful API access for integrations', false, '{"rate_limit": 1000}'::jsonb),
  ('mobile_app', 'Mobile app features', false, '{"platforms": ["ios", "android"]}'::jsonb)
ON CONFLICT (flag_name) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary of extensibility features added:
-- 1. JSONB columns for flexible configuration (features, metadata)
-- 2. System admin vs admin role distinction
-- 3. Banner and advertising system with analytics
-- 4. Directory listings for business members
-- 5. Team ownership and competition preferences
-- 6. Audit logging for compliance and debugging
-- 7. Feature flags system for gradual rollouts
-- 8. Helper functions for common extensibility patterns
-- 9. Comments on all tables/columns for documentation
-- 10. Indexes optimized for common query patterns
-- =====================================================
