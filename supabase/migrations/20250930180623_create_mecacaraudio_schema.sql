/*
  # MECACARAUDIO.COM Database Schema

  ## Overview
  Complete database structure for car audio competition management system with:
  - User management with role-based access control
  - Event management and registration
  - Competition results tracking
  - Membership management
  - Leaderboard and rankings

  ## New Tables

  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, FK to auth.users)
  - `email` (text)
  - `full_name` (text)
  - `phone` (text)
  - `role` (enum: user, event_director, retailer, admin)
  - `membership_status` (enum: none, active, expired)
  - `membership_expiry` (timestamptz)
  - `avatar_url` (text)
  - `bio` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `events`
  Competition events with details
  - `id` (uuid, PK)
  - `title` (text)
  - `description` (text)
  - `event_date` (timestamptz)
  - `registration_deadline` (timestamptz)
  - `venue_name` (text)
  - `venue_address` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `flyer_url` (text)
  - `event_director_id` (uuid, FK to profiles)
  - `status` (enum: upcoming, ongoing, completed, cancelled)
  - `max_participants` (integer)
  - `registration_fee` (numeric)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `event_registrations`
  Pre-registrations for events
  - `id` (uuid, PK)
  - `event_id` (uuid, FK to events)
  - `user_id` (uuid, FK to profiles, nullable for non-members)
  - `full_name` (text, for non-members)
  - `email` (text, for non-members)
  - `phone` (text)
  - `vehicle_info` (text)
  - `competition_class` (text)
  - `registration_date` (timestamptz)
  - `payment_status` (enum: pending, paid, refunded)
  - `status` (enum: pending, confirmed, cancelled)

  ### 4. `competition_results`
  Results from competition events
  - `id` (uuid, PK)
  - `event_id` (uuid, FK to events)
  - `competitor_id` (uuid, FK to profiles, nullable)
  - `competitor_name` (text)
  - `competition_class` (text)
  - `score` (numeric)
  - `placement` (integer)
  - `points_earned` (integer)
  - `vehicle_info` (text)
  - `notes` (text)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)

  ### 5. `memberships`
  Membership purchase history
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `membership_type` (enum: annual, lifetime)
  - `purchase_date` (timestamptz)
  - `expiry_date` (timestamptz)
  - `amount_paid` (numeric)
  - `payment_method` (text)
  - `status` (enum: active, expired, cancelled)

  ## Security
  - Enable RLS on all tables
  - Profiles: Users can view all profiles, update own profile, admins can manage all
  - Events: Public can view, event directors and admins can create/update
  - Registrations: Users can create and view own, event directors and admins can view all
  - Results: Public can view, admins and event directors can create/update
  - Memberships: Users can view own, admins can view all

  ## Indexes
  - Events by date and status for calendar queries
  - Results by event and competitor for leaderboard
  - Registrations by event for participant lists
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'event_director', 'retailer', 'admin');
CREATE TYPE membership_status AS ENUM ('none', 'active', 'expired');
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');
CREATE TYPE registration_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE membership_type AS ENUM ('annual', 'lifetime');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role user_role DEFAULT 'user' NOT NULL,
  membership_status membership_status DEFAULT 'none' NOT NULL,
  membership_expiry timestamptz,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  registration_deadline timestamptz,
  venue_name text NOT NULL,
  venue_address text NOT NULL,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  flyer_url text,
  event_director_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status event_status DEFAULT 'upcoming' NOT NULL,
  max_participants integer,
  registration_fee numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  vehicle_info text,
  competition_class text,
  registration_date timestamptz DEFAULT now() NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  status registration_status DEFAULT 'pending' NOT NULL
);

-- Competition results table
CREATE TABLE IF NOT EXISTS competition_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  competitor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  competitor_name text NOT NULL,
  competition_class text NOT NULL,
  score numeric(10, 2) NOT NULL,
  placement integer NOT NULL,
  points_earned integer DEFAULT 0 NOT NULL,
  vehicle_info text,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  membership_type membership_type NOT NULL,
  purchase_date timestamptz DEFAULT now() NOT NULL,
  expiry_date timestamptz,
  amount_paid numeric(10, 2) NOT NULL,
  payment_method text,
  status membership_status DEFAULT 'active' NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS events_date_idx ON events(event_date);
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
CREATE INDEX IF NOT EXISTS results_event_idx ON competition_results(event_id);
CREATE INDEX IF NOT EXISTS results_competitor_idx ON competition_results(competitor_id);
CREATE INDEX IF NOT EXISTS results_points_idx ON competition_results(points_earned DESC);
CREATE INDEX IF NOT EXISTS registrations_event_idx ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS registrations_user_idx ON event_registrations(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Events policies
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Event directors can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('event_director', 'admin')
    )
  );

CREATE POLICY "Event directors can update own events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.role = 'event_director' AND events.event_director_id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR (profiles.role = 'event_director' AND events.event_director_id = auth.uid()))
    )
  );

-- Event registrations policies
CREATE POLICY "Users can view own registrations"
  ON event_registrations FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('event_director', 'admin')
    )
  );

CREATE POLICY "Anyone can create registrations"
  ON event_registrations FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Event directors can update registrations"
  ON event_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('event_director', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('event_director', 'admin')
    )
  );

-- Competition results policies
CREATE POLICY "Results are viewable by everyone"
  ON competition_results FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Event directors and admins can create results"
  ON competition_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('event_director', 'admin')
    )
  );

CREATE POLICY "Event directors and admins can update results"
  ON competition_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('event_director', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('event_director', 'admin')
    )
  );

-- Memberships policies
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();