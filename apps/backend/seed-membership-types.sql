-- Seed Default Membership Type Configurations
-- Run this script after the membership_type_configs table has been created
-- and after update-membership-schema.sql has been run

-- First, clear existing data to refresh with new structure
TRUNCATE TABLE membership_type_configs;

-- Insert membership type configurations
-- Public memberships: Competitor, Team, Retailer
-- Admin-only memberships: Manufacturer (Bronze, Silver, Gold tiers)

INSERT INTO membership_type_configs (
  id,
  name,
  description,
  category,
  tier,
  price,
  currency,
  benefits,
  required_fields,
  optional_fields,
  is_active,
  is_featured,
  show_on_public_site,
  display_order,
  created_at,
  updated_at
) VALUES
-- Competitor Membership (public)
(
  gen_random_uuid(),
  'Annual Competitor Membership',
  'Annual membership for competitors to participate in MECA events',
  'competitor',
  NULL,
  50.00,
  'USD',
  '["Compete in all MECA events", "Points tracking for championships", "Access to member portal", "Digital membership card", "Event discounts", "Leaderboard eligibility"]'::jsonb,
  '["name", "email", "phone", "address", "city", "state", "zip", "country"]'::jsonb,
  '["phone_secondary", "website", "bio", "vehicle_info", "competition_classes"]'::jsonb,
  true,
  true,
  true,
  1,
  NOW(),
  NOW()
),
-- Team Membership (public)
(
  gen_random_uuid(),
  'Annual Team Membership',
  'Annual membership for competition teams',
  'team',
  NULL,
  100.00,
  'USD',
  '["Team points tracking", "Team roster management", "Team branding on website", "Bulk competitor registration", "Team leaderboard"]'::jsonb,
  '["name", "email", "phone", "address", "city", "state", "zip", "country", "team_name", "contact_name"]'::jsonb,
  '["phone_secondary", "website", "bio", "team_logo", "social_media"]'::jsonb,
  true,
  false,
  true,
  2,
  NOW(),
  NOW()
),
-- Retailer Membership (public)
(
  gen_random_uuid(),
  'Annual Retailer Membership',
  'Annual membership for car audio retailers',
  'retail',
  NULL,
  200.00,
  'USD',
  '["Business listing on website", "Event sponsorship opportunities", "Access to competitor network", "Promotional materials", "Retailer directory listing"]'::jsonb,
  '["name", "email", "phone", "address", "city", "state", "zip", "country", "business_name", "website"]'::jsonb,
  '["phone_secondary", "bio", "business_hours", "services_offered", "social_media"]'::jsonb,
  true,
  false,
  true,
  3,
  NOW(),
  NOW()
),
-- Manufacturer Bronze Tier (admin-only)
(
  gen_random_uuid(),
  'Manufacturer Bronze Membership',
  'Bronze tier annual membership for manufacturers',
  'manufacturer',
  'bronze',
  500.00,
  'USD',
  '["Basic business listing", "Event sponsorship opportunities", "Access to competitor network", "Promotional materials"]'::jsonb,
  '["name", "email", "phone", "address", "city", "state", "zip", "country", "company_name", "website", "product_categories"]'::jsonb,
  '["phone_secondary", "bio", "product_catalog", "distributor_info", "social_media"]'::jsonb,
  true,
  false,
  false,
  4,
  NOW(),
  NOW()
),
-- Manufacturer Silver Tier (admin-only)
(
  gen_random_uuid(),
  'Manufacturer Silver Membership',
  'Silver tier annual membership for manufacturers',
  'manufacturer',
  'silver',
  1000.00,
  'USD',
  '["Premium business listing", "Priority event sponsorship", "Direct access to competitors", "Marketing analytics", "Product showcase opportunities"]'::jsonb,
  '["name", "email", "phone", "address", "city", "state", "zip", "country", "company_name", "website", "product_categories"]'::jsonb,
  '["phone_secondary", "bio", "product_catalog", "distributor_info", "social_media"]'::jsonb,
  true,
  false,
  false,
  5,
  NOW(),
  NOW()
),
-- Manufacturer Gold Tier (admin-only)
(
  gen_random_uuid(),
  'Manufacturer Gold Membership',
  'Gold tier annual membership for manufacturers with maximum benefits',
  'manufacturer',
  'gold',
  2000.00,
  'USD',
  '["Premium business listing with featured placement", "Exclusive event sponsorship packages", "Direct access to competitors", "Advanced marketing analytics", "Product showcase at events", "Priority support", "Co-branding opportunities"]'::jsonb,
  '["name", "email", "phone", "address", "city", "state", "zip", "country", "company_name", "website", "product_categories"]'::jsonb,
  '["phone_secondary", "bio", "product_catalog", "distributor_info", "social_media"]'::jsonb,
  true,
  false,
  false,
  6,
  NOW(),
  NOW()
);

-- Show summary
SELECT
  name,
  category,
  tier,
  price,
  show_on_public_site as "Public Site"
FROM membership_type_configs
ORDER BY display_order;
