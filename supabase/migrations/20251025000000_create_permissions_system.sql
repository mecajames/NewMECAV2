-- =====================================================
-- Core Permissions and Membership Types System
-- =====================================================
-- Creates the foundational tables for the permission system
-- that the extensible membership migration depends on
-- =====================================================

-- =====================================================
-- 1. CREATE PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);

-- Add trigger for updated_at
CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view permissions
CREATE POLICY "Anyone can view permissions"
  ON permissions FOR SELECT
  USING (true);

-- Only admins can manage permissions
CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'system_admin')
    )
  );

COMMENT ON TABLE permissions IS 'System permissions that can be assigned to roles or individual users';
COMMENT ON COLUMN permissions.category IS 'Permission category: users, events, competition, content, financial, communication, system';

-- =====================================================
-- 2. CREATE ROLE PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role, permission_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view role permissions
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions FOR SELECT
  USING (true);

-- Only admins can manage role permissions
CREATE POLICY "Admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'system_admin')
    )
  );

COMMENT ON TABLE role_permissions IS 'Maps roles to their assigned permissions';

-- =====================================================
-- 3. CREATE USER PERMISSION OVERRIDES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  PRIMARY KEY (user_id, permission_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_permission ON user_permission_overrides(permission_id);

-- Enable RLS
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view their own overrides
CREATE POLICY "Users can view own permission overrides"
  ON user_permission_overrides FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin')
  ));

-- Only admins can manage user permission overrides
CREATE POLICY "Admins can manage user permission overrides"
  ON user_permission_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'system_admin')
    )
  );

COMMENT ON TABLE user_permission_overrides IS 'User-specific permission grants or denials that override role permissions';
COMMENT ON COLUMN user_permission_overrides.granted IS 'true = grant permission, false = explicitly deny permission';

-- =====================================================
-- 4. CREATE MEMBERSHIP TYPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS membership_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_membership_types_active ON membership_types(is_active);
CREATE INDEX IF NOT EXISTS idx_membership_types_display_order ON membership_types(display_order);

-- Add trigger for updated_at
CREATE TRIGGER update_membership_types_updated_at
  BEFORE UPDATE ON membership_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE membership_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view active membership types
CREATE POLICY "Anyone can view active membership types"
  ON membership_types FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin')
  ));

-- Only admins can manage membership types
CREATE POLICY "Admins can manage membership types"
  ON membership_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'system_admin')
    )
  );

COMMENT ON TABLE membership_types IS 'Membership tier definitions with pricing and duration';

-- =====================================================
-- 5. INSERT INITIAL PERMISSIONS
-- =====================================================

INSERT INTO permissions (name, description, category) VALUES
  -- System-level permissions (only for system_admin)
  ('access_system_settings', 'Access system configuration and settings', 'system'),
  ('access_system_configuration', 'Modify core system configuration', 'system'),
  ('manage_membership_types', 'Create, edit, and delete membership types', 'system'),
  ('manage_database', 'Access database management tools', 'system'),

  -- User management
  ('manage_users', 'Manage user accounts and profiles', 'users'),
  ('manage_teams', 'Manage team structures and memberships', 'users'),
  ('view_users', 'View user profiles and information', 'users'),

  -- Event management
  ('manage_events', 'Create, edit, and delete events', 'events'),
  ('request_event', 'Request to add new events to the system', 'events'),
  ('manage_event_results', 'Enter and manage results for completed events', 'events'),
  ('view_events', 'View events', 'events'),

  -- Competition management
  ('manage_seasons', 'Manage competition seasons', 'competition'),
  ('manage_classes', 'Manage competition classes', 'competition'),
  ('manage_results', 'Manage competition results', 'competition'),

  -- Content management
  ('manage_media', 'Manage media files and library', 'content'),
  ('manage_rulebooks', 'Manage rulebook documents', 'content'),
  ('manage_directory_listings', 'Manage directory listings', 'content'),
  ('manage_banner_ads', 'Manage banner advertisements', 'content'),
  ('view_analytics', 'View system analytics and reports', 'content'),

  -- Permission management
  ('manage_permissions', 'Manage system permissions', 'system'),
  ('assign_permissions', 'Assign permissions to users and roles', 'system'),

  -- Communication
  ('send_notifications', 'Send notifications to users', 'communication'),
  ('manage_notifications', 'Manage notification system', 'communication'),

  -- Financial
  ('manage_orders', 'Manage orders and payments', 'financial'),
  ('view_financial_reports', 'View financial reports', 'financial'),

  -- API and integrations
  ('access_api', 'Access API endpoints for integrations', 'system')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 6. ASSIGN DEFAULT PERMISSIONS TO ROLES
-- =====================================================

-- System Admin gets ALL permissions (via function, but also explicitly)
INSERT INTO role_permissions (role, permission_id)
SELECT 'system_admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Admin gets all permissions EXCEPT system-level ones
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
WHERE category != 'system'
ON CONFLICT DO NOTHING;

-- Event Director gets event-related permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'event_director', id FROM permissions
WHERE name IN (
  'request_event',
  'manage_event_results',
  'view_events',
  'view_users'
)
ON CONFLICT DO NOTHING;

-- Retailer gets directory and limited content permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'retailer', id FROM permissions
WHERE name IN (
  'manage_directory_listings',
  'manage_banner_ads',
  'view_events'
)
ON CONFLICT DO NOTHING;

-- Regular users get basic view permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions
WHERE name IN (
  'view_events'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. INSERT INITIAL MEMBERSHIP TYPES
-- =====================================================

INSERT INTO membership_types (name, description, price, duration_months, display_order) VALUES
  ('Competitor', 'Individual competitor membership with MECA ID and event registration', 50.00, 12, 1),
  ('Team', 'Team membership allowing team ownership and multiple members', 100.00, 12, 2),
  ('Retailer', 'Retail business membership with directory listing and banner ad', 250.00, 12, 3),
  ('Manufacturer Bronze', 'Basic manufacturer membership with directory listing', 500.00, 12, 4),
  ('Manufacturer Silver', 'Silver manufacturer membership with enhanced features', 1000.00, 12, 5),
  ('Manufacturer Gold', 'Premium manufacturer membership with maximum benefits', 2000.00, 12, 6)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON SCHEMA public IS 'Core permissions and membership types system created. Extensible membership migration can now be applied.';
