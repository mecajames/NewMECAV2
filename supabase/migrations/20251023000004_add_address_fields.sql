-- Add billing and shipping address fields to profiles table

ALTER TABLE profiles
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
ADD COLUMN IF NOT EXISTS use_billing_for_shipping BOOLEAN DEFAULT false;

-- Add index for searching by zip code or city
CREATE INDEX IF NOT EXISTS idx_profiles_billing_zip ON profiles(billing_zip);
CREATE INDEX IF NOT EXISTS idx_profiles_billing_city ON profiles(billing_city);
