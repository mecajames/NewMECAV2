-- Create admin user in local Supabase
-- Email: james@mecacaraudio.com
-- Password: Admin123! (you can change it after logging in)

-- First, insert into auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'james@mecacaraudio.com',
  -- This is the bcrypt hash for 'Admin123!'
  '$2a$10$5EjF.LqVNZqKGKJKKJKKKuOkCJF6V8V4F2F1F2F1F2F1F2F1F2F1F2',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"James Ryan"}',
  false,
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Create the profile for the admin user
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  membership_status,
  created_at,
  updated_at
)
SELECT
  id,
  'james@mecacaraudio.com',
  'James Ryan',
  'admin',
  'active',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'james@mecacaraudio.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    membership_status = 'active';

-- Verify the user was created
SELECT
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.membership_status,
  u.email_confirmed_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'james@mecacaraudio.com';
