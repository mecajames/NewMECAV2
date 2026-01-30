-- Migration: Fix Supabase Performance Advisor Warnings
-- Issues addressed:
-- 1. Auth RLS Initialization Plan on points_configuration (3 policies)
-- 2. Duplicate Index on orders (3 indexes on member_id)
-- 3. Duplicate Index on profiles (2 unique constraints + 1 index on meca_id)

-- ============================================
-- 1. FIX RLS POLICIES ON points_configuration
-- ============================================
-- The issue: auth.uid() is being re-evaluated for each row in the subquery
-- The fix: Use (SELECT auth.uid()) to evaluate once and cache the result

-- Drop existing policies
DROP POLICY IF EXISTS "points_configuration_delete_policy" ON "public"."points_configuration";
DROP POLICY IF EXISTS "points_configuration_insert_policy" ON "public"."points_configuration";
DROP POLICY IF EXISTS "points_configuration_update_policy" ON "public"."points_configuration";
DROP POLICY IF EXISTS "points_configuration_select_policy" ON "public"."points_configuration";

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "points_configuration_select_policy"
ON "public"."points_configuration"
FOR SELECT
USING (true);

CREATE POLICY "points_configuration_insert_policy"
ON "public"."points_configuration"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."profiles" "p"
    WHERE "p"."id" = (SELECT auth.uid())
    AND "p"."role" = 'admin'::"public"."user_role"
  )
);

CREATE POLICY "points_configuration_update_policy"
ON "public"."points_configuration"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "public"."profiles" "p"
    WHERE "p"."id" = (SELECT auth.uid())
    AND "p"."role" = 'admin'::"public"."user_role"
  )
);

CREATE POLICY "points_configuration_delete_policy"
ON "public"."points_configuration"
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "public"."profiles" "p"
    WHERE "p"."id" = (SELECT auth.uid())
    AND "p"."role" = 'admin'::"public"."user_role"
  )
);

-- ============================================
-- 2. FIX DUPLICATE INDEXES ON orders
-- ============================================
-- There are 3 indexes on member_id:
-- - idx_orders_member (keep this one)
-- - idx_orders_member_id (duplicate - drop)
-- - idx_orders_user (duplicate - drop)

DROP INDEX IF EXISTS "public"."idx_orders_member_id";
DROP INDEX IF EXISTS "public"."idx_orders_user";

-- ============================================
-- 3. FIX DUPLICATE INDEXES ON profiles
-- ============================================
-- There are 2 unique constraints and 1 index on meca_id:
-- - profiles_meca_id_key (UNIQUE constraint - keep)
-- - profiles_meca_id_unique (duplicate UNIQUE constraint - drop)
-- - idx_profiles_meca_id (redundant index since UNIQUE creates one - drop)

-- Drop the duplicate unique constraint
ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_meca_id_unique";

-- Drop the redundant index (UNIQUE constraint already creates an index)
DROP INDEX IF EXISTS "public"."idx_profiles_meca_id";
