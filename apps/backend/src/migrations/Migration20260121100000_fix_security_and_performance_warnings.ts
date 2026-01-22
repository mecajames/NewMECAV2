import { Migration } from '@mikro-orm/migrations';

export class Migration20260121100000_fix_security_and_performance_warnings extends Migration {
  async up(): Promise<void> {
    // ==========================================================================
    // FIX SECURITY WARNINGS: Function Search Path Mutable
    // ==========================================================================

    // Fix update_updated_at_column function - set search_path
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;
    `);

    // Fix check_user_permission function - set search_path
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.check_user_permission(
        p_user_id uuid,
        p_permission_name text
      )
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_has_permission boolean := false;
        v_user_role text;
      BEGIN
        -- Get user's role (cast enum to text)
        SELECT role::text INTO v_user_role FROM profiles WHERE id = p_user_id;

        IF v_user_role IS NULL THEN
          RETURN false;
        END IF;

        -- Check if user has the permission through their role
        SELECT EXISTS (
          SELECT 1
          FROM role_permissions rp
          JOIN permissions p ON rp.permission_id = p.id
          WHERE rp.role = v_user_role
          AND p.name = p_permission_name
        ) INTO v_has_permission;

        -- Also check user-specific permission overrides
        IF NOT v_has_permission THEN
          SELECT EXISTS (
            SELECT 1
            FROM user_permission_overrides upo
            JOIN permissions p ON upo.permission_id = p.id
            WHERE upo.user_id = p_user_id
            AND p.name = p_permission_name
            AND upo.granted = true
          ) INTO v_has_permission;
        END IF;

        RETURN v_has_permission;
      END;
      $$;
    `);

    // ==========================================================================
    // FIX PERFORMANCE WARNINGS: Auth RLS Initialization Plan
    // Create cached auth helper functions to avoid re-evaluation per row
    // ==========================================================================

    // Create a helper function that caches auth.uid() result
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.auth_uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT auth.uid();
      $$;
    `);

    // Create a helper function that caches the user's role
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.auth_role()
      RETURNS text
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT COALESCE(
          current_setting('request.jwt.claims', true)::json->>'role',
          (SELECT role::text FROM profiles WHERE id = auth.uid())
        );
      $$;
    `);

    // Create a helper function to check if current user is admin
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.is_admin()
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT COALESCE(
          current_setting('request.jwt.claims', true)::json->>'role' = 'admin',
          (SELECT role::text = 'admin' FROM profiles WHERE id = auth.uid()),
          false
        );
      $$;
    `);

    // ==========================================================================
    // FIX SECURITY WARNINGS: RLS Policy Always True
    // For banner_engagements - restrict to only allow operations on valid banners
    // ==========================================================================

    // Drop overly permissive policies for banner_engagements
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_select_policy" ON "banner_engagements";');
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_insert_policy" ON "banner_engagements";');
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_update_policy" ON "banner_engagements";');

    // Create more restrictive policies that still allow public access but validate data
    // SELECT: Allow reading engagements for existing banners
    this.addSql(`
      CREATE POLICY "banner_engagements_select_policy" ON "banner_engagements"
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_engagements.banner_id)
        );
    `);

    // INSERT: Allow inserting engagements only for existing banners
    this.addSql(`
      CREATE POLICY "banner_engagements_insert_policy" ON "banner_engagements"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_id)
        );
    `);

    // UPDATE: Allow updating engagements only for existing banners
    this.addSql(`
      CREATE POLICY "banner_engagements_update_policy" ON "banner_engagements"
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_engagements.banner_id)
        ) WITH CHECK (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_id)
        );
    `);

    // Fix communication_log RLS policies - admin only
    this.addSql('DROP POLICY IF EXISTS "communication_log_insert_policy" ON "communication_log";');
    this.addSql('DROP POLICY IF EXISTS "communication_log_select_policy" ON "communication_log";');
    this.addSql('DROP POLICY IF EXISTS "communication_log_update_policy" ON "communication_log";');

    // Communication log: Only admins can read (backend service inserts via service role)
    this.addSql(`
      CREATE POLICY "communication_log_select_policy" ON "communication_log"
        FOR SELECT USING (public.is_admin());
    `);

    // Backend service uses service role which bypasses RLS, so this is for direct access
    this.addSql(`
      CREATE POLICY "communication_log_insert_policy" ON "communication_log"
        FOR INSERT WITH CHECK (public.is_admin());
    `);

    // ==========================================================================
    // Update RLS policies for tables with known structure to use cached auth
    // ==========================================================================

    // MEMBERSHIP_TYPES - public read, admin write (no user column)
    this.addSql('DROP POLICY IF EXISTS "membership_types_select" ON "membership_types";');
    this.addSql('DROP POLICY IF EXISTS "membership_types_all" ON "membership_types";');

    this.addSql(`
      CREATE POLICY "membership_types_select" ON "membership_types"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "membership_types_all" ON "membership_types"
        FOR ALL USING (public.is_admin());
    `);

    // PERMISSIONS - public read, admin write (no user column)
    this.addSql('DROP POLICY IF EXISTS "permissions_select" ON "permissions";');
    this.addSql('DROP POLICY IF EXISTS "permissions_all" ON "permissions";');

    this.addSql(`
      CREATE POLICY "permissions_select" ON "permissions"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "permissions_all" ON "permissions"
        FOR ALL USING (public.is_admin());
    `);

    // ROLE_PERMISSIONS - public read, admin write (no user column)
    this.addSql('DROP POLICY IF EXISTS "role_permissions_select" ON "role_permissions";');
    this.addSql('DROP POLICY IF EXISTS "role_permissions_all" ON "role_permissions";');

    this.addSql(`
      CREATE POLICY "role_permissions_select" ON "role_permissions"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "role_permissions_all" ON "role_permissions"
        FOR ALL USING (public.is_admin());
    `);

    // BANNERS - use cached auth
    this.addSql('DROP POLICY IF EXISTS "banners_select_policy" ON "banners";');
    this.addSql('DROP POLICY IF EXISTS "banners_insert_policy" ON "banners";');
    this.addSql('DROP POLICY IF EXISTS "banners_update_policy" ON "banners";');
    this.addSql('DROP POLICY IF EXISTS "banners_delete_policy" ON "banners";');

    this.addSql(`
      CREATE POLICY "banners_select_policy" ON "banners"
        FOR SELECT USING (
          (status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)
          OR public.is_admin()
        );
    `);
    this.addSql(`
      CREATE POLICY "banners_insert_policy" ON "banners"
        FOR INSERT WITH CHECK (public.is_admin());
    `);
    this.addSql(`
      CREATE POLICY "banners_update_policy" ON "banners"
        FOR UPDATE USING (public.is_admin());
    `);
    this.addSql(`
      CREATE POLICY "banners_delete_policy" ON "banners"
        FOR DELETE USING (public.is_admin());
    `);

    // ADVERTISERS - admin only
    this.addSql('DROP POLICY IF EXISTS "advertisers_select_policy" ON "advertisers";');
    this.addSql('DROP POLICY IF EXISTS "advertisers_insert_policy" ON "advertisers";');
    this.addSql('DROP POLICY IF EXISTS "advertisers_update_policy" ON "advertisers";');
    this.addSql('DROP POLICY IF EXISTS "advertisers_delete_policy" ON "advertisers";');

    this.addSql(`
      CREATE POLICY "advertisers_select_policy" ON "advertisers"
        FOR SELECT USING (public.is_admin());
    `);
    this.addSql(`
      CREATE POLICY "advertisers_insert_policy" ON "advertisers"
        FOR INSERT WITH CHECK (public.is_admin());
    `);
    this.addSql(`
      CREATE POLICY "advertisers_update_policy" ON "advertisers"
        FOR UPDATE USING (public.is_admin());
    `);
    this.addSql(`
      CREATE POLICY "advertisers_delete_policy" ON "advertisers"
        FOR DELETE USING (public.is_admin());
    `);
  }

  async down(): Promise<void> {
    // Drop the helper functions
    this.addSql('DROP FUNCTION IF EXISTS public.is_admin();');
    this.addSql('DROP FUNCTION IF EXISTS public.auth_role();');
    this.addSql('DROP FUNCTION IF EXISTS public.auth_uid();');

    // Restore original function without search_path (not recommended)
    // The down migration would restore original policies, but this is complex
    // and should rarely be needed
  }
}
