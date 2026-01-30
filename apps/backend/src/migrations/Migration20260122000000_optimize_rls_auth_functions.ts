import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Optimize RLS Auth Function Performance
 *
 * This migration creates optimized helper functions for RLS policies
 * and updates the existing is_admin_or_event_director() function to use
 * cached auth.uid() calls via CTEs.
 *
 * Key changes:
 * 1. Creates rls_is_admin() - STABLE function that caches admin check
 * 2. Creates rls_is_admin_or_event_director() - STABLE function with CTE
 * 3. Creates rls_is_owner() - STABLE function for ownership checks
 * 4. Creates rls_is_owner_or_admin() - STABLE function combining ownership + admin
 * 5. Updates is_admin_or_event_director() to use CTE for cached auth.uid()
 *
 * These functions are marked STABLE and SECURITY DEFINER, which allows
 * PostgreSQL to cache the auth.uid() result within a single query execution,
 * fixing the "Auth RLS Initialization Plan" performance warnings.
 *
 * Note: The actual policy updates were applied directly to the database.
 * This migration ensures the helper functions exist for any new database.
 */
export class Migration20260122000000_optimize_rls_auth_functions extends Migration {
  async up(): Promise<void> {
    // Create optimized helper function for checking if current user is admin
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_admin()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        );
      $$;
    `);

    // Create optimized helper function for checking if current user is admin or event director
    // Uses CTE to cache auth.uid() - only evaluated once per query
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_admin_or_event_director()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT uid FROM current_uid)
          AND role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM event_directors ed
          WHERE ed.user_id = (SELECT uid FROM current_uid)
          AND ed.is_active = true
        );
      $$;
    `);

    // Create helper function to get cached auth uid
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_current_uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        SELECT auth.uid();
      $$;
    `);

    // Create helper function to check if user owns a resource
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_owner(resource_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        SELECT resource_user_id = auth.uid();
      $$;
    `);

    // Create helper function to check if user owns a resource or is admin
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_owner_or_admin(resource_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT resource_user_id = (SELECT uid FROM current_uid)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT uid FROM current_uid)
          AND role = 'admin'
        );
      $$;
    `);

    // Update existing is_admin_or_event_director() to use CTE for cached auth.uid()
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.is_admin_or_event_director()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT uid FROM current_uid)
          AND role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM event_directors ed
          WHERE ed.user_id = (SELECT uid FROM current_uid)
          AND ed.is_active = true
        );
      $$;
    `);
  }

  async down(): Promise<void> {
    // Drop the new helper functions
    this.addSql(`DROP FUNCTION IF EXISTS public.rls_is_admin();`);
    this.addSql(`DROP FUNCTION IF EXISTS public.rls_is_admin_or_event_director();`);
    this.addSql(`DROP FUNCTION IF EXISTS public.rls_current_uid();`);
    this.addSql(`DROP FUNCTION IF EXISTS public.rls_is_owner(uuid);`);
    this.addSql(`DROP FUNCTION IF EXISTS public.rls_is_owner_or_admin(uuid);`);

    // Restore original is_admin_or_event_director() without CTE
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.is_admin_or_event_director()
      RETURNS boolean
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN (
          SELECT COALESCE(
            (SELECT (profiles.role)::text = 'admin'
             FROM profiles
             WHERE profiles.id = auth.uid()),
            false
          )
        ) OR EXISTS (
          SELECT 1 FROM event_directors ed
          WHERE ed.user_id = auth.uid() AND ed.is_active = true
        );
      END;
      $$;
    `);
  }
}
