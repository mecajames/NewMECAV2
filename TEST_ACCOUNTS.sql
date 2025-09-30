-- TEST ACCOUNTS SETUP
-- Run this SQL in your Supabase SQL Editor to create test accounts
--
-- IMPORTANT: You must first create these user accounts through the Sign Up page:
-- 1. admin@mecacaraudio.com
-- 2. director@mecacaraudio.com
-- 3. user@mecacaraudio.com
-- 4. retailer@mecacaraudio.com
--
-- Then run this SQL to update their roles:

-- Update admin account
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@mecacaraudio.com';

-- Update event director account
UPDATE profiles
SET role = 'event_director'
WHERE email = 'director@mecacaraudio.com';

-- Update retailer account
UPDATE profiles
SET role = 'retailer'
WHERE email = 'retailer@mecacaraudio.com';

-- Verify the updates
SELECT email, full_name, role, membership_status
FROM profiles
WHERE email IN (
  'admin@mecacaraudio.com',
  'director@mecacaraudio.com',
  'user@mecacaraudio.com',
  'retailer@mecacaraudio.com'
);

-- Optional: Create a sample event (requires admin user ID)
-- Replace 'ADMIN_USER_ID_HERE' with the actual UUID of the admin user

/*
INSERT INTO events (
  title,
  description,
  event_date,
  registration_deadline,
  venue_name,
  venue_address,
  event_director_id,
  status,
  registration_fee,
  flyer_url
) VALUES (
  'Spring Car Audio Championship 2025',
  'Join us for the biggest car audio competition of the spring season! All classes welcome.',
  '2025-05-15 10:00:00',
  '2025-05-10 23:59:59',
  'Downtown Convention Center',
  '123 Main Street, Los Angeles, CA 90012',
  (SELECT id FROM profiles WHERE email = 'director@mecacaraudio.com'),
  'upcoming',
  50.00,
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg'
);

INSERT INTO events (
  title,
  description,
  event_date,
  venue_name,
  venue_address,
  event_director_id,
  status,
  registration_fee
) VALUES (
  'Summer Showdown 2025',
  'The ultimate summer car audio competition featuring SPL and SQL categories.',
  '2025-07-20 09:00:00',
  'County Fairgrounds',
  '456 Fair Drive, San Diego, CA 92101',
  (SELECT id FROM profiles WHERE email = 'director@mecacaraudio.com'),
  'upcoming',
  75.00
);
*/

-- Optional: Add sample rulebooks

/*
INSERT INTO rulebooks (
  title,
  description,
  year,
  category,
  pdf_url,
  summary_points,
  is_active,
  display_order
) VALUES (
  '2025 MECA SPL Rule Book',
  'Official rules and regulations for Sound Pressure League competitions. All competitors must adhere to these guidelines.',
  2025,
  'SPL',
  'https://mecacaraudio.com/wp-content/uploads/2024/11/2025-MECA-SPL-Rule-Book.pdf',
  '["Points are accumulated throughout the season based on placement", "All vehicles must pass safety inspection before competing", "Sound measurements must be taken using approved equipment", "Competitors must be current MECA members", "Vehicles must remain in their registered class for the entire season"]'::jsonb,
  true,
  1
),
(
  '2025 MECA SQL Rule Book',
  'Official rules and regulations for Sound Quality League competitions.',
  2025,
  'SQL',
  'https://mecacaraudio.com/wp-content/uploads/2024/11/2025-MECA-SQL-Rule-Book.pdf',
  '["Judging based on sound quality, installation, and presentation", "Multiple categories available for different skill levels", "Detailed scoring rubric provided for transparency", "Professional judges certified by MECA"]'::jsonb,
  true,
  2
),
(
  '2025 Show N Shine Rules',
  'Rules for vehicle appearance and presentation competitions.',
  2025,
  'Show N Shine',
  'https://mecacaraudio.com/wp-content/uploads/2024/11/Show-N-Shine-Rules.pdf',
  '["Judged on overall appearance and cleanliness", "Interior and exterior evaluation", "Audio system integration and aesthetics", "Creativity and uniqueness bonus points"]'::jsonb,
  true,
  3
);
*/
