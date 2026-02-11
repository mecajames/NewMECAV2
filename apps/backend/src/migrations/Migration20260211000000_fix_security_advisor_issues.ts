import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Fix Supabase Security Advisor Issues
 *
 * Resolves:
 * 1. ERROR - RLS Disabled on processed_webhook_events
 * 2. WARNINGS - Function Search Path Mutable on 6 RLS functions
 * 3. PERFORMANCE - Auth RLS Initialization Plan on points_configuration policies
 * 4. PERFORMANCE - Duplicate indexes on orders and profiles tables
 */
export class Migration20260211000000_fix_security_advisor_issues extends Migration {
  async up(): Promise<void> {
    // =========================================================================
    // 1. Enable RLS on processed_webhook_events
    //    This table is only accessed by the backend via service_role key,
    //    so we block all direct access from anon/authenticated roles.
    // =========================================================================
    this.addSql(`ALTER TABLE "public"."processed_webhook_events" ENABLE ROW LEVEL SECURITY;`);

    // No policies needed - backend uses service_role which bypasses RLS.
    // This effectively blocks any direct PostgREST access to this table.

    // =========================================================================
    // 2. Fix Function Search Path Mutable warnings
    //    All SECURITY DEFINER functions need SET search_path = '' to prevent
    //    search_path manipulation attacks.
    // =========================================================================

    // 2a. rls_is_admin()
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_admin()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        );
      $$;
    `);

    // 2b. rls_is_admin_or_event_director()
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_admin_or_event_director()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
      AS $$
        WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT uid FROM current_uid)
          AND role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM public.event_directors ed
          WHERE ed.user_id = (SELECT uid FROM current_uid)
          AND ed.is_active = true
        );
      $$;
    `);

    // 2c. rls_current_uid()
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_current_uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
      AS $$
        SELECT auth.uid();
      $$;
    `);

    // 2d. rls_is_owner()
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_owner(resource_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
      AS $$
        SELECT resource_user_id = auth.uid();
      $$;
    `);

    // 2e. rls_is_owner_or_admin()
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_owner_or_admin(resource_user_id uuid)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
      AS $$
        WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT resource_user_id = (SELECT uid FROM current_uid)
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT uid FROM current_uid)
          AND role = 'admin'
        );
      $$;
    `);

    // 2f. is_admin_or_event_director()
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.is_admin_or_event_director()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = ''
      AS $$
        WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT uid FROM current_uid)
          AND role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM public.event_directors ed
          WHERE ed.user_id = (SELECT uid FROM current_uid)
          AND ed.is_active = true
        );
      $$;
    `);

    // Also fix create_default_points_configuration trigger function
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.create_default_points_configuration()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $$
      BEGIN
        INSERT INTO public.points_configuration (
          season_id,
          standard_1st_place, standard_2nd_place, standard_3rd_place, standard_4th_place, standard_5th_place,
          four_x_1st_place, four_x_2nd_place, four_x_3rd_place, four_x_4th_place, four_x_5th_place,
          four_x_extended_enabled, four_x_extended_points, four_x_extended_max_place,
          is_active, description
        ) VALUES (
          NEW.id,
          5, 4, 3, 2, 1,
          30, 27, 24, 21, 18,
          false, 15, 50,
          true, 'Default configuration for ' || NEW.name
        );
        RETURN NEW;
      END;
      $$;
    `);

    // =========================================================================
    // 3. Fix Auth RLS Initialization Plan on points_configuration
    //    Replace inline auth.uid() calls with cached rls_is_admin() function
    // =========================================================================

    // Drop existing policies
    this.addSql(`DROP POLICY IF EXISTS "points_configuration_insert_policy" ON "points_configuration";`);
    this.addSql(`DROP POLICY IF EXISTS "points_configuration_update_policy" ON "points_configuration";`);
    this.addSql(`DROP POLICY IF EXISTS "points_configuration_delete_policy" ON "points_configuration";`);

    // Recreate policies using the cached rls_is_admin() function
    this.addSql(`
      CREATE POLICY "points_configuration_insert_policy" ON "points_configuration"
        FOR INSERT WITH CHECK (public.rls_is_admin());
    `);

    this.addSql(`
      CREATE POLICY "points_configuration_update_policy" ON "points_configuration"
        FOR UPDATE USING (public.rls_is_admin());
    `);

    this.addSql(`
      CREATE POLICY "points_configuration_delete_policy" ON "points_configuration"
        FOR DELETE USING (public.rls_is_admin());
    `);

    // =========================================================================
    // 4. Remove duplicate indexes
    //    - orders: idx_orders_user duplicates idx_orders_member (both on member_id)
    //    - profiles: idx_profiles_meca_id duplicates the unique constraint index
    // =========================================================================

    // Drop duplicate index on orders (idx_orders_user is same as idx_orders_member)
    this.addSql(`DROP INDEX IF EXISTS "idx_orders_user";`);

    // Drop duplicate index on profiles (unique constraint on meca_id already creates an index)
    this.addSql(`DROP INDEX IF EXISTS "idx_profiles_meca_id";`);
  }

  async down(): Promise<void> {
    // Restore duplicate indexes
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_orders_user" ON "public"."orders" USING "btree" ("member_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_profiles_meca_id" ON "public"."profiles" USING "btree" ("meca_id");`);

    // Restore points_configuration policies with inline auth.uid()
    this.addSql(`DROP POLICY IF EXISTS "points_configuration_insert_policy" ON "points_configuration";`);
    this.addSql(`DROP POLICY IF EXISTS "points_configuration_update_policy" ON "points_configuration";`);
    this.addSql(`DROP POLICY IF EXISTS "points_configuration_delete_policy" ON "points_configuration";`);

    this.addSql(`
      CREATE POLICY "points_configuration_insert_policy" ON "points_configuration"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
          )
        );
    `);

    this.addSql(`
      CREATE POLICY "points_configuration_update_policy" ON "points_configuration"
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
          )
        );
    `);

    this.addSql(`
      CREATE POLICY "points_configuration_delete_policy" ON "points_configuration"
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
          )
        );
    `);

    // Restore functions without SET search_path
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_admin()
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'); $$;
    `);

    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_admin_or_event_director()
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT uid FROM current_uid) AND role = 'admin')
        OR EXISTS (SELECT 1 FROM event_directors ed WHERE ed.user_id = (SELECT uid FROM current_uid) AND ed.is_active = true); $$;
    `);

    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_current_uid()
      RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ SELECT auth.uid(); $$;
    `);

    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_owner(resource_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ SELECT resource_user_id = auth.uid(); $$;
    `);

    this.addSql(`
      CREATE OR REPLACE FUNCTION public.rls_is_owner_or_admin(resource_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT resource_user_id = (SELECT uid FROM current_uid)
        OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT uid FROM current_uid) AND role = 'admin'); $$;
    `);

    this.addSql(`
      CREATE OR REPLACE FUNCTION public.is_admin_or_event_director()
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
      AS $$ WITH current_uid AS (SELECT auth.uid() AS uid)
        SELECT EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT uid FROM current_uid) AND role = 'admin')
        OR EXISTS (SELECT 1 FROM event_directors ed WHERE ed.user_id = (SELECT uid FROM current_uid) AND ed.is_active = true); $$;
    `);

    // Disable RLS on processed_webhook_events
    this.addSql(`ALTER TABLE "public"."processed_webhook_events" DISABLE ROW LEVEL SECURITY;`);
  }
}
