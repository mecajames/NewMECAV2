-- =====================================================
-- MECA Member Management System - Complete Schema
-- =====================================================

-- =====================================================
-- 1. UPDATE PROFILES TABLE
-- =====================================================

-- Add new columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS meca_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS billing_street TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_state TEXT,
ADD COLUMN IF NOT EXISTS billing_zip TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS shipping_street TEXT,
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_state TEXT,
ADD COLUMN IF NOT EXISTS shipping_zip TEXT,
ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS use_billing_for_shipping BOOLEAN DEFAULT true;

-- Migrate existing full_name data to first_name/last_name
UPDATE profiles
SET
  first_name = SPLIT_PART(full_name, ' ', 1),
  last_name = CASE
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(full_name, ' '), 1) > 1
    THEN SUBSTRING(full_name FROM LENGTH(SPLIT_PART(full_name, ' ', 1)) + 2)
    ELSE ''
  END
WHERE full_name IS NOT NULL AND first_name IS NULL;

-- Make first_name and last_name NOT NULL after migration
ALTER TABLE profiles
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Set MECA ID for existing user (202401)
UPDATE profiles
SET meca_id = 202401
WHERE email = 'james@mecacaraudio.com' AND meca_id IS NULL;

-- Create index on meca_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_meca_id ON profiles(meca_id);

-- =====================================================
-- 2. MECA ID SEQUENCE AND GENERATION FUNCTION
-- =====================================================

-- Create sequence for MECA IDs starting at 700800
CREATE SEQUENCE IF NOT EXISTS meca_id_seq START WITH 700800 INCREMENT BY 1;

-- Function to generate next MECA ID
CREATE OR REPLACE FUNCTION generate_meca_id()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_id INTEGER;
BEGIN
  -- Get the next value from sequence
  next_id := nextval('meca_id_seq');

  -- Check if this ID already exists (for safety)
  WHILE EXISTS (SELECT 1 FROM profiles WHERE meca_id = next_id) LOOP
    next_id := nextval('meca_id_seq');
  END LOOP;

  RETURN next_id;
END;
$$;

-- =====================================================
-- 3. PERMISSIONS SYSTEM TABLES
-- =====================================================

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'users', 'events', 'content', 'financial', 'settings'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role permissions (which permissions each role has)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- User-specific permission overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL, -- true = add permission, false = remove permission
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- Indexes for permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user ON user_permission_overrides(user_id);

-- =====================================================
-- 4. MEMBERSHIP TYPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS membership_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default membership types
INSERT INTO membership_types (name, description, price, duration_months) VALUES
  ('Competitor', 'Individual competitor membership', 40.00, 12),
  ('Team', 'Team membership for groups', 60.00, 12),
  ('Retailer', 'Retailer business membership', 100.00, 12),
  ('Manufacturer Bronze', 'Manufacturer tier 1 membership', 1000.00, 12),
  ('Manufacturer Silver', 'Manufacturer tier 2 membership', 3500.00, 12),
  ('Manufacturer Gold', 'Manufacturer tier 3 membership', 10000.00, 12)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 5. ORDERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL, -- 'membership', 'event_registration', 'merchandise', 'subscription'
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled', 'refunded'
  payment_method TEXT, -- 'stripe', 'paypal', 'manual'
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid', 'partially_paid', 'refunded'
  payment_intent_id TEXT, -- Stripe payment intent ID
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'membership', 'event_registration', 'merchandise'
  item_id UUID, -- references specific item (event_id, membership_type_id, etc.)
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Order number sequence
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number(p_member_meca_id INTEGER, p_order_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
BEGIN
  -- Determine prefix based on order type
  prefix := CASE
    WHEN p_order_type = 'subscription' THEN 'MECA-SUB-'
    ELSE 'MECA-ORD-'
  END;

  -- Get next number
  next_num := nextval('order_number_seq');

  -- Format: MECA-ORD-700800-001 or MECA-SUB-700800-001
  RETURN prefix || p_member_meca_id || '-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- =====================================================
-- 6. INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
  due_date DATE,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_member ON invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  next_num := nextval('invoice_number_seq');
  -- Format: MECA-INV-0001
  RETURN 'MECA-INV-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

-- =====================================================
-- 7. MEMBERSHIPS TABLE (Actual membership records)
-- =====================================================

-- Update existing memberships table or create if not exists
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_type_id UUID REFERENCES membership_types(id),
  membership_type_name TEXT NOT NULL, -- Stored for historical record
  start_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  renewal_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled'
  auto_renew BOOLEAN DEFAULT false,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key if memberships table already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'user_id') THEN
    ALTER TABLE memberships RENAME COLUMN user_id TO member_id;
  END IF;
END $$;

-- Indexes for memberships
CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

-- =====================================================
-- 8. SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL, -- 'membership', 'premium_features'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'past_due'
  billing_cycle TEXT NOT NULL, -- 'monthly', 'annual'
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  next_billing_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  stripe_subscription_id TEXT,
  paypal_subscription_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- =====================================================
-- 9. TEAMS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'manager', 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, member_id)
);

-- Indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_id);

-- =====================================================
-- 10. MEMBER GALLERY IMAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS member_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for gallery images
CREATE INDEX IF NOT EXISTS idx_gallery_images_member ON member_gallery_images(member_id);

-- =====================================================
-- 11. INTERNAL MESSAGING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES messages(id), -- For threading
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);

-- =====================================================
-- 12. COMMUNICATION LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL, -- 'email', 'sms', 'system_message'
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'delivered', 'read'
  recipient TEXT, -- email address or phone number
  sent_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for communication log
CREATE INDEX IF NOT EXISTS idx_communication_log_member ON communication_log(member_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_type ON communication_log(communication_type);

-- =====================================================
-- 13. UPDATE TRIGGERS
-- =====================================================

-- Trigger for updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables that need updated_at
DO $$
BEGIN
  -- membership_types
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_membership_types_updated_at') THEN
    CREATE TRIGGER update_membership_types_updated_at
    BEFORE UPDATE ON membership_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- orders
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
    CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- invoices
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
    CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- memberships
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_memberships_updated_at') THEN
    CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- subscriptions
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
    CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- teams
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teams_updated_at') THEN
    CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- 14. SEED INITIAL PERMISSIONS
-- =====================================================

-- Insert base permissions
INSERT INTO permissions (name, description, category) VALUES
  -- User Management
  ('view_users', 'View user list and profiles', 'users'),
  ('create_user', 'Create new users manually', 'users'),
  ('edit_user', 'Edit user information', 'users'),
  ('delete_user', 'Delete users', 'users'),
  ('manage_roles', 'Assign and change user roles', 'users'),
  ('manage_permissions', 'Manage user permissions', 'users'),

  -- Event Management
  ('view_events', 'View events list', 'events'),
  ('create_event', 'Create new events', 'events'),
  ('edit_event', 'Edit event details', 'events'),
  ('delete_event', 'Delete events', 'events'),
  ('manage_registrations', 'Manage event registrations', 'events'),

  -- Competition Management
  ('view_results', 'View competition results', 'competition'),
  ('enter_results', 'Enter competition results', 'competition'),
  ('edit_results', 'Edit competition results', 'competition'),
  ('delete_results', 'Delete competition results', 'competition'),

  -- Content Management
  ('manage_media', 'Manage media library', 'content'),
  ('manage_rulebooks', 'Manage rulebooks', 'content'),
  ('manage_site_settings', 'Manage site settings', 'content'),

  -- Financial Management
  ('view_orders', 'View all orders', 'financial'),
  ('create_order', 'Create orders for members', 'financial'),
  ('manage_invoices', 'Create and manage invoices', 'financial'),
  ('manage_subscriptions', 'Manage member subscriptions', 'financial'),
  ('view_financial_reports', 'View financial reports', 'financial'),

  -- Communication
  ('send_system_messages', 'Send internal system messages', 'communication'),
  ('send_emails', 'Send emails to members', 'communication'),
  ('send_sms', 'Send SMS to members', 'communication')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to event_director role
INSERT INTO role_permissions (role, permission_id)
SELECT 'event_director', id FROM permissions WHERE name IN (
  'view_events', 'create_event', 'edit_event', 'manage_registrations',
  'view_results', 'enter_results', 'edit_results'
)
ON CONFLICT DO NOTHING;

-- Assign basic permissions to user role
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions WHERE name IN (
  'view_events', 'view_results'
)
ON CONFLICT DO NOTHING;

-- Note: Admin role automatically gets ALL permissions (handled in permission check function)

-- =====================================================
-- 15. PERMISSION CHECK FUNCTION
-- =====================================================

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

  -- If user is admin, always return true
  IF user_role = 'admin' THEN
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_user_permission(UUID, TEXT) TO authenticated;

-- =====================================================
-- 16. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;

-- Permissions tables - only admins can manage
CREATE POLICY "Admins can manage permissions" ON permissions FOR ALL
  USING (check_user_permission(auth.uid(), 'manage_permissions'));

CREATE POLICY "Admins can manage role permissions" ON role_permissions FOR ALL
  USING (check_user_permission(auth.uid(), 'manage_permissions'));

CREATE POLICY "Admins can manage permission overrides" ON user_permission_overrides FOR ALL
  USING (check_user_permission(auth.uid(), 'manage_permissions'));

-- Membership types - public read, admin manage
CREATE POLICY "Anyone can view membership types" ON membership_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage membership types" ON membership_types FOR ALL
  USING (check_user_permission(auth.uid(), 'manage_site_settings'));

-- Orders - users can view own, admins can view all
CREATE POLICY "Users can view own orders" ON orders FOR SELECT
  USING (member_id = auth.uid() OR check_user_permission(auth.uid(), 'view_orders'));

CREATE POLICY "Admins can manage orders" ON orders FOR ALL
  USING (check_user_permission(auth.uid(), 'create_order'));

-- Order items - follow order policy
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id
    AND (orders.member_id = auth.uid() OR check_user_permission(auth.uid(), 'view_orders'))
  ));

-- Invoices - similar to orders
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT
  USING (member_id = auth.uid() OR check_user_permission(auth.uid(), 'manage_invoices'));

CREATE POLICY "Admins can manage invoices" ON invoices FOR ALL
  USING (check_user_permission(auth.uid(), 'manage_invoices'));

-- Memberships - users can view own, admins can manage
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
CREATE POLICY "Users can view own memberships" ON memberships FOR SELECT
  USING (member_id = auth.uid() OR check_user_permission(auth.uid(), 'view_users'));

DROP POLICY IF EXISTS "Admins can manage memberships" ON memberships;
CREATE POLICY "Admins can manage memberships" ON memberships FOR ALL
  USING (check_user_permission(auth.uid(), 'manage_subscriptions'));

-- Subscriptions - similar to memberships
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT
  USING (member_id = auth.uid() OR check_user_permission(auth.uid(), 'view_users'));

CREATE POLICY "Admins can manage subscriptions" ON subscriptions FOR ALL
  USING (check_user_permission(auth.uid(), 'manage_subscriptions'));

-- Teams - public read, owner/admin manage
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT
  USING (true);

CREATE POLICY "Owners and admins can manage teams" ON teams FOR ALL
  USING (owner_id = auth.uid() OR check_user_permission(auth.uid(), 'edit_user'));

-- Team members - public read, team owner/admin manage
CREATE POLICY "Anyone can view team members" ON team_members FOR SELECT
  USING (true);

CREATE POLICY "Team owners can manage members" ON team_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_members.team_id
    AND (teams.owner_id = auth.uid() OR check_user_permission(auth.uid(), 'edit_user'))
  ));

-- Gallery images - public read own, owner manage
CREATE POLICY "Anyone can view public gallery images" ON member_gallery_images FOR SELECT
  USING (is_public = true OR member_id = auth.uid() OR check_user_permission(auth.uid(), 'view_users'));

CREATE POLICY "Users can manage own gallery" ON member_gallery_images FOR ALL
  USING (member_id = auth.uid() OR check_user_permission(auth.uid(), 'manage_media'));

-- Messages - users can view own messages
CREATE POLICY "Users can view own messages" ON messages FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR check_user_permission(auth.uid(), 'send_system_messages'));

CREATE POLICY "Users can send messages" ON messages FOR INSERT
  WITH CHECK (from_user_id = auth.uid() OR check_user_permission(auth.uid(), 'send_system_messages'));

CREATE POLICY "Users can update own received messages" ON messages FOR UPDATE
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- Communication log - admins only
CREATE POLICY "Admins can view communication log" ON communication_log FOR SELECT
  USING (check_user_permission(auth.uid(), 'send_emails') OR check_user_permission(auth.uid(), 'send_sms'));

CREATE POLICY "System can insert communication log" ON communication_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
