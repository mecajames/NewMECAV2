-- Create membership_type_configs table with enum types
-- This is the schema creation from the migration

-- Create membership_category enum type
DO $$ BEGIN
  CREATE TYPE membership_category AS ENUM ('competitor', 'team', 'retail', 'manufacturer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create membership_duration enum type
DO $$ BEGIN
  CREATE TYPE membership_duration AS ENUM ('annual', 'lifetime');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create membership_type_configs table
CREATE TABLE IF NOT EXISTS "membership_type_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "category" membership_category NOT NULL,
  "duration" membership_duration NOT NULL,
  "price" decimal(10,2) NOT NULL,
  "currency" varchar(3) DEFAULT 'USD',
  "benefits" jsonb,
  "required_fields" jsonb,
  "optional_fields" jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_featured" boolean NOT NULL DEFAULT false,
  "display_order" integer NOT NULL DEFAULT 0,
  "stripe_price_id" text,
  "stripe_product_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_membership_configs_category" ON "membership_type_configs"("category");
CREATE INDEX IF NOT EXISTS "idx_membership_configs_duration" ON "membership_type_configs"("duration");
CREATE INDEX IF NOT EXISTS "idx_membership_configs_active" ON "membership_type_configs"("is_active");
CREATE INDEX IF NOT EXISTS "idx_membership_configs_featured" ON "membership_type_configs"("is_featured");
CREATE INDEX IF NOT EXISTS "idx_membership_configs_display_order" ON "membership_type_configs"("display_order");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_membership_configs_name" ON "membership_type_configs"("name");
