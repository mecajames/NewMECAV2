/*
  # Fix Security and Performance Issues

  ## Changes
  
  1. **Add Missing Indexes for Foreign Keys**
     - Add index on `competition_results.created_by`
     - Add index on `events.event_director_id`
     - Add index on `memberships.user_id`
  
  2. **Optimize RLS Policies**
     - Replace `auth.uid()` with `(SELECT auth.uid())` in all policies
     - This prevents re-evaluation for each row, improving performance at scale
  
  3. **Fix Function Search Path**
     - Set immutable search_path for `update_updated_at_column` function
  
  ## Performance Impact
  - Significantly improves query performance for foreign key lookups
  - Reduces RLS policy evaluation overhead
  - Ensures predictable function behavior
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS competition_results_created_by_idx 
  ON competition_results(created_by);

CREATE INDEX IF NOT EXISTS events_event_director_id_idx 
  ON events(event_director_id);

CREATE INDEX IF NOT EXISTS memberships_user_id_idx 
  ON memberships(user_id);

-- =====================================================
-- 2. FIX RLS POLICIES - OPTIMIZE AUTH FUNCTION CALLS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Event directors can create events" ON events;
DROP POLICY IF EXISTS "Event directors can update own events" ON events;
DROP POLICY IF EXISTS "Users can view own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Event directors can update registrations" ON event_registrations;
DROP POLICY IF EXISTS "Event directors and admins can create results" ON competition_results;
DROP POLICY IF EXISTS "Event directors and admins can update results" ON competition_results;
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create rulebooks" ON rulebooks;
DROP POLICY IF EXISTS "Admins can update rulebooks" ON rulebooks;

-- Recreate policies with optimized auth function calls

-- PROFILES POLICIES
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- EVENTS POLICIES
CREATE POLICY "Event directors can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('event_director', 'admin')
    )
  );

CREATE POLICY "Event directors can update own events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND (profiles.role = 'admin' OR (profiles.role = 'event_director' AND events.event_director_id = (SELECT auth.uid())))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND (profiles.role = 'admin' OR (profiles.role = 'event_director' AND events.event_director_id = (SELECT auth.uid())))
    )
  );

-- EVENT REGISTRATIONS POLICIES
CREATE POLICY "Users can view own registrations"
  ON event_registrations FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('event_director', 'admin')
    )
  );

CREATE POLICY "Event directors can update registrations"
  ON event_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('event_director', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('event_director', 'admin')
    )
  );

-- COMPETITION RESULTS POLICIES
CREATE POLICY "Event directors and admins can create results"
  ON competition_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('event_director', 'admin')
    )
  );

CREATE POLICY "Event directors and admins can update results"
  ON competition_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('event_director', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('event_director', 'admin')
    )
  );

-- MEMBERSHIPS POLICIES
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- RULEBOOKS POLICIES
CREATE POLICY "Admins can create rulebooks"
  ON rulebooks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update rulebooks"
  ON rulebooks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 3. FIX FUNCTION SEARCH PATH
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_rulebooks_updated_at ON rulebooks;

-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rulebooks_updated_at 
  BEFORE UPDATE ON rulebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();