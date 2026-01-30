-- ============================================================
-- Fix ISO Standards and Add Orders Columns
-- Generated: 2026-01-22
-- ============================================================

BEGIN;

-- ============================================================
-- PART 1: Add Missing Columns to Orders Table
-- ============================================================

-- Add order_items (jsonb)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_items jsonb;

-- Add subtotal (numeric 10,2)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);

-- Add tax (numeric 10,2 default 0.00)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tax numeric(10,2) DEFAULT 0.00;

-- Add discount (numeric 10,2 default 0.00)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS discount numeric(10,2) DEFAULT 0.00;

-- Add total (numeric 10,2)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS total numeric(10,2);

-- Add currency (varchar 3 default 'USD')
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'USD';

-- Add billing_address (jsonb)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS billing_address jsonb;

-- Add metadata (jsonb)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add payment_id (uuid)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_id uuid;

-- Add invoice_id (uuid)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_id uuid;

-- Add guest_email (varchar 255)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS guest_email varchar(255);

-- Add guest_name (varchar 255)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS guest_name varchar(255);

-- Add shop_order_reference (jsonb)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shop_order_reference jsonb;

-- ============================================================
-- PART 2: Fix ISO Country Code Defaults
-- ============================================================

-- Fix profiles.billing_country default: 'USA' -> 'US'
ALTER TABLE public.profiles
ALTER COLUMN billing_country SET DEFAULT 'US';

-- Fix profiles.shipping_country default: 'USA' -> 'US'
ALTER TABLE public.profiles
ALTER COLUMN shipping_country SET DEFAULT 'US';

-- Fix event_hosting_requests.country default: 'United States' -> 'US'
ALTER TABLE public.event_hosting_requests
ALTER COLUMN country SET DEFAULT 'US';

-- Fix manufacturer_listings.country default: 'USA' -> 'US'
ALTER TABLE public.manufacturer_listings
ALTER COLUMN country SET DEFAULT 'US';

-- Fix retailer_listings.country default: 'USA' -> 'US'
ALTER TABLE public.retailer_listings
ALTER COLUMN country SET DEFAULT 'US';

-- ============================================================
-- PART 3: Update Existing Data to ISO Standards
-- ============================================================

-- Update profiles billing_country
UPDATE public.profiles
SET billing_country = 'US'
WHERE billing_country IN ('USA', 'United States', 'U.S.A.', 'U.S.');

-- Update profiles shipping_country
UPDATE public.profiles
SET shipping_country = 'US'
WHERE shipping_country IN ('USA', 'United States', 'U.S.A.', 'U.S.');

-- Update profiles country
UPDATE public.profiles
SET country = 'US'
WHERE country IN ('USA', 'United States', 'U.S.A.', 'U.S.');

-- Update event_hosting_requests country
UPDATE public.event_hosting_requests
SET country = 'US'
WHERE country IN ('USA', 'United States', 'U.S.A.', 'U.S.');

-- Update manufacturer_listings country
UPDATE public.manufacturer_listings
SET country = 'US'
WHERE country IN ('USA', 'United States', 'U.S.A.', 'U.S.');

-- Update retailer_listings country
UPDATE public.retailer_listings
SET country = 'US'
WHERE country IN ('USA', 'United States', 'U.S.A.', 'U.S.');

-- Update events venue_country
UPDATE public.events
SET venue_country = 'US'
WHERE venue_country IN ('USA', 'United States', 'U.S.A.', 'U.S.');

-- Update memberships billing_country
UPDATE public.memberships
SET billing_country = 'US'
WHERE billing_country IN ('USA', 'United States', 'U.S.A.', 'U.S.');

COMMIT;

-- ============================================================
-- Verification
-- ============================================================

-- Show new orders columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- Verify no more 'USA' or 'United States' defaults
SELECT table_name, column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND (column_default LIKE '%USA%' OR column_default LIKE '%United States%');
