import { Migration } from '@mikro-orm/migrations';

/**
 * NUCLEAR RLS CLEANUP
 *
 * This migration completely drops ALL RLS policies on all tables,
 * then recreates them fresh with proper caching.
 *
 * This fixes:
 * - Duplicate policies causing "Multiple Permissive Policies" warnings
 * - Uncached auth.uid() and auth.jwt() calls causing performance warnings
 */
export class Migration20260121300000_nuclear_rls_cleanup extends Migration {
  async up(): Promise<void> {
    // =========================================================================
    // STEP 1: DROP ALL EXISTING POLICIES
    // Using a DO block to dynamically drop all policies
    // =========================================================================
    this.addSql(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT schemaname, tablename, policyname
          FROM pg_policies
          WHERE schemaname = 'public'
        ) LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        END LOOP;
      END $$;
    `);

    // =========================================================================
    // STEP 2: RECREATE ALL POLICIES WITH PROPER CACHING
    // Using (SELECT auth.uid()) pattern for caching
    // =========================================================================

    // --- PROFILES ---
    this.addSql(`
      CREATE POLICY "profiles_select" ON "profiles"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "profiles_insert" ON "profiles"
        FOR INSERT WITH CHECK (id = (SELECT auth.uid()));
    `);
    this.addSql(`
      CREATE POLICY "profiles_update" ON "profiles"
        FOR UPDATE USING (
          id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role::text = 'admin')
        );
    `);

    // --- PERMISSIONS ---
    this.addSql(`
      CREATE POLICY "permissions_select" ON "permissions"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "permissions_admin" ON "permissions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- ROLE_PERMISSIONS ---
    this.addSql(`
      CREATE POLICY "role_permissions_select" ON "role_permissions"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "role_permissions_admin" ON "role_permissions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- USER_PERMISSION_OVERRIDES (user_id column) ---
    this.addSql(`
      CREATE POLICY "user_permission_overrides_select" ON "user_permission_overrides"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "user_permission_overrides_admin" ON "user_permission_overrides"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- MEMBERSHIP_TYPES ---
    this.addSql(`
      CREATE POLICY "membership_types_select" ON "membership_types"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "membership_types_admin" ON "membership_types"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- ORDERS (member_id column) ---
    this.addSql(`
      CREATE POLICY "orders_select" ON "orders"
        FOR SELECT USING (
          member_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "orders_insert" ON "orders"
        FOR INSERT WITH CHECK (
          member_id = (SELECT auth.uid())
          OR member_id IS NULL
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "orders_admin" ON "orders"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- ORDER_ITEMS ---
    this.addSql(`
      CREATE POLICY "order_items_select" ON "order_items"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND (orders.member_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin'))
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "order_items_admin" ON "order_items"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- INVOICES (user_id column) ---
    this.addSql(`
      CREATE POLICY "invoices_select" ON "invoices"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "invoices_admin" ON "invoices"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- INVOICE_ITEMS ---
    this.addSql(`
      CREATE POLICY "invoice_items_select" ON "invoice_items"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND (invoices.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin'))
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "invoice_items_admin" ON "invoice_items"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- MEMBERSHIPS (user_id column) ---
    this.addSql(`
      CREATE POLICY "memberships_select" ON "memberships"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "memberships_admin" ON "memberships"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- SUBSCRIPTIONS (member_id column) ---
    this.addSql(`
      CREATE POLICY "subscriptions_select" ON "subscriptions"
        FOR SELECT USING (
          member_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "subscriptions_admin" ON "subscriptions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- TEAMS (captain_id column) ---
    this.addSql(`
      CREATE POLICY "teams_select" ON "teams"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "teams_write" ON "teams"
        FOR ALL USING (
          captain_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- TEAM_MEMBERS ---
    this.addSql(`
      CREATE POLICY "team_members_select" ON "team_members"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "team_members_write" ON "team_members"
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = team_members.team_id
            AND (teams.captain_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin'))
          )
        );
    `);

    // --- MEMBER_GALLERY_IMAGES (member_id column) ---
    this.addSql(`
      CREATE POLICY "member_gallery_images_select" ON "member_gallery_images"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "member_gallery_images_write" ON "member_gallery_images"
        FOR ALL USING (
          member_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- MESSAGES (from_user_id, to_user_id columns) ---
    this.addSql(`
      CREATE POLICY "messages_select" ON "messages"
        FOR SELECT USING (
          from_user_id = (SELECT auth.uid())
          OR to_user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "messages_insert" ON "messages"
        FOR INSERT WITH CHECK (
          from_user_id = (SELECT auth.uid())
        );
    `);
    this.addSql(`
      CREATE POLICY "messages_update" ON "messages"
        FOR UPDATE USING (
          to_user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- COMMUNICATION_LOG (admin only) ---
    this.addSql(`
      CREATE POLICY "communication_log_admin" ON "communication_log"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- NOTIFICATIONS (user_id column) ---
    this.addSql(`
      CREATE POLICY "notifications_select" ON "notifications"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "notifications_insert" ON "notifications"
        FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    `);
    this.addSql(`
      CREATE POLICY "notifications_update" ON "notifications"
        FOR UPDATE USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "notifications_delete" ON "notifications"
        FOR DELETE USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- EVENTS ---
    this.addSql(`
      CREATE POLICY "events_select" ON "events"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "events_write" ON "events"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);

    // --- EVENT_REGISTRATIONS (user_id column) ---
    this.addSql(`
      CREATE POLICY "event_registrations_select" ON "event_registrations"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "event_registrations_insert" ON "event_registrations"
        FOR INSERT WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "event_registrations_write" ON "event_registrations"
        FOR ALL USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);

    // --- COMPETITION_RESULTS ---
    this.addSql(`
      CREATE POLICY "competition_results_select" ON "competition_results"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "competition_results_write" ON "competition_results"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);

    // --- SEASONS ---
    this.addSql(`
      CREATE POLICY "seasons_select" ON "seasons"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "seasons_admin" ON "seasons"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- COMPETITION_CLASSES ---
    this.addSql(`
      CREATE POLICY "competition_classes_select" ON "competition_classes"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "competition_classes_admin" ON "competition_classes"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- MEDIA_FILES ---
    this.addSql(`
      CREATE POLICY "media_files_select" ON "media_files"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "media_files_admin" ON "media_files"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- SITE_SETTINGS ---
    this.addSql(`
      CREATE POLICY "site_settings_select" ON "site_settings"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "site_settings_admin" ON "site_settings"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- RULEBOOKS ---
    this.addSql(`
      CREATE POLICY "rulebooks_select" ON "rulebooks"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "rulebooks_admin" ON "rulebooks"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- BANNERS ---
    this.addSql(`
      CREATE POLICY "banners_select" ON "banners"
        FOR SELECT USING (
          (status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "banners_admin" ON "banners"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- ADVERTISERS ---
    this.addSql(`
      CREATE POLICY "advertisers_admin" ON "advertisers"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- BANNER_ENGAGEMENTS ---
    this.addSql(`
      CREATE POLICY "banner_engagements_select" ON "banner_engagements"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "banner_engagements_insert" ON "banner_engagements"
        FOR INSERT WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "banner_engagements_update" ON "banner_engagements"
        FOR UPDATE USING (true);
    `);

    // --- ACHIEVEMENT_DEFINITIONS ---
    this.addSql(`
      CREATE POLICY "achievement_definitions_select" ON "achievement_definitions"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "achievement_definitions_admin" ON "achievement_definitions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- ACHIEVEMENT_RECIPIENTS ---
    this.addSql(`
      CREATE POLICY "achievement_recipients_select" ON "achievement_recipients"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "achievement_recipients_admin" ON "achievement_recipients"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- ACHIEVEMENT_TEMPLATES ---
    this.addSql(`
      CREATE POLICY "achievement_templates_select" ON "achievement_templates"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "achievement_templates_admin" ON "achievement_templates"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- SHOP_PRODUCTS ---
    this.addSql(`
      CREATE POLICY "shop_products_select" ON "shop_products"
        FOR SELECT USING (
          is_active = true
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "shop_products_admin" ON "shop_products"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- SHOP_ORDERS (user_id column) ---
    this.addSql(`
      CREATE POLICY "shop_orders_select" ON "shop_orders"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "shop_orders_insert" ON "shop_orders"
        FOR INSERT WITH CHECK (
          user_id = (SELECT auth.uid())
          OR user_id IS NULL
        );
    `);
    this.addSql(`
      CREATE POLICY "shop_orders_admin" ON "shop_orders"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- SHOP_ORDER_ITEMS ---
    this.addSql(`
      CREATE POLICY "shop_order_items_select" ON "shop_order_items"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM shop_orders
            WHERE shop_orders.id = shop_order_items.order_id
            AND (shop_orders.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin'))
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "shop_order_items_insert" ON "shop_order_items"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM shop_orders
            WHERE shop_orders.id = order_id
            AND (shop_orders.user_id = (SELECT auth.uid()) OR shop_orders.user_id IS NULL)
          )
        );
    `);

    // --- TRAINING_RECORDS (admin only) ---
    this.addSql(`
      CREATE POLICY "training_records_admin" ON "training_records"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- CONTACT_SUBMISSIONS (admin only) ---
    this.addSql(`
      CREATE POLICY "contact_submissions_insert" ON "contact_submissions"
        FOR INSERT WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "contact_submissions_admin" ON "contact_submissions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- EVENT_HOSTING_REQUESTS (user_id column) ---
    this.addSql(`
      CREATE POLICY "event_hosting_requests_select" ON "event_hosting_requests"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin'))
        );
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_requests_insert" ON "event_hosting_requests"
        FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_requests_write" ON "event_hosting_requests"
        FOR ALL USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin'))
        );
    `);

    // --- EVENT_HOSTING_REQUEST_MESSAGES ---
    this.addSql(`
      CREATE POLICY "event_hosting_request_messages_select" ON "event_hosting_request_messages"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM event_hosting_requests
            WHERE event_hosting_requests.id = event_hosting_request_messages.request_id
            AND (event_hosting_requests.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin')))
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_request_messages_insert" ON "event_hosting_request_messages"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM event_hosting_requests
            WHERE event_hosting_requests.id = request_id
            AND (event_hosting_requests.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin')))
          )
        );
    `);

    // --- WORLD_FINALS_QUALIFICATIONS ---
    this.addSql(`
      CREATE POLICY "world_finals_qualifications_select" ON "world_finals_qualifications"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "world_finals_qualifications_admin" ON "world_finals_qualifications"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- CHAMPIONSHIP_ARCHIVES ---
    this.addSql(`
      CREATE POLICY "championship_archives_select" ON "championship_archives"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "championship_archives_admin" ON "championship_archives"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- CHAMPIONSHIP_AWARDS ---
    this.addSql(`
      CREATE POLICY "championship_awards_select" ON "championship_awards"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "championship_awards_admin" ON "championship_awards"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- JUDGES ---
    this.addSql(`
      CREATE POLICY "judges_select" ON "judges"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "judges_admin" ON "judges"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- JUDGE_APPLICATIONS ---
    this.addSql(`
      CREATE POLICY "judge_applications_select" ON "judge_applications"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "judge_applications_insert" ON "judge_applications"
        FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    `);
    this.addSql(`
      CREATE POLICY "judge_applications_admin" ON "judge_applications"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- EVENT_DIRECTORS ---
    this.addSql(`
      CREATE POLICY "event_directors_select" ON "event_directors"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "event_directors_admin" ON "event_directors"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- EVENT_DIRECTOR_APPLICATIONS ---
    this.addSql(`
      CREATE POLICY "event_director_applications_select" ON "event_director_applications"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "event_director_applications_insert" ON "event_director_applications"
        FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    `);
    this.addSql(`
      CREATE POLICY "event_director_applications_admin" ON "event_director_applications"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- EVENT_DIRECTOR_ASSIGNMENTS ---
    this.addSql(`
      CREATE POLICY "event_director_assignments_select" ON "event_director_assignments"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "event_director_assignments_admin" ON "event_director_assignments"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- EVENT_JUDGE_ASSIGNMENTS ---
    this.addSql(`
      CREATE POLICY "event_judge_assignments_select" ON "event_judge_assignments"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "event_judge_assignments_admin" ON "event_judge_assignments"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- RETAILER_LISTINGS ---
    this.addSql(`
      CREATE POLICY "retailer_listings_select" ON "retailer_listings"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "retailer_listings_write" ON "retailer_listings"
        FOR ALL USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- MANUFACTURER_LISTINGS ---
    this.addSql(`
      CREATE POLICY "manufacturer_listings_select" ON "manufacturer_listings"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "manufacturer_listings_write" ON "manufacturer_listings"
        FOR ALL USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- PAYMENTS (user_id column) ---
    this.addSql(`
      CREATE POLICY "payments_select" ON "payments"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "payments_admin" ON "payments"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- TICKETS (reporter_id, assigned_to_id columns) ---
    this.addSql(`
      CREATE POLICY "tickets_select" ON "tickets"
        FOR SELECT USING (
          reporter_id = (SELECT auth.uid())
          OR assigned_to_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "tickets_insert" ON "tickets"
        FOR INSERT WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "tickets_write" ON "tickets"
        FOR ALL USING (
          reporter_id = (SELECT auth.uid())
          OR assigned_to_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- TICKET_COMMENTS ---
    this.addSql(`
      CREATE POLICY "ticket_comments_select" ON "ticket_comments"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM tickets
            WHERE tickets.id = ticket_comments.ticket_id
            AND (tickets.reporter_id = (SELECT auth.uid()) OR tickets.assigned_to_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin'))
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "ticket_comments_insert" ON "ticket_comments"
        FOR INSERT WITH CHECK (true);
    `);

    // --- RATINGS ---
    this.addSql(`
      CREATE POLICY "ratings_select" ON "ratings"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "ratings_insert" ON "ratings"
        FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    `);
    this.addSql(`
      CREATE POLICY "ratings_write" ON "ratings"
        FOR ALL USING (
          rater_user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- EVENT_REGISTRATION_CLASSES ---
    this.addSql(`
      CREATE POLICY "event_registration_classes_select" ON "event_registration_classes"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "event_registration_classes_write" ON "event_registration_classes"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);

    // --- MECA_ID_HISTORY (profile_id column) ---
    this.addSql(`
      CREATE POLICY "meca_id_history_select" ON "meca_id_history"
        FOR SELECT USING (
          profile_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "meca_id_history_admin" ON "meca_id_history"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- RESULTS_AUDIT_LOG ---
    this.addSql(`
      CREATE POLICY "results_audit_log_select" ON "results_audit_log"
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "results_audit_log_insert" ON "results_audit_log"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);

    // --- RESULTS_ENTRY_SESSIONS ---
    this.addSql(`
      CREATE POLICY "results_entry_sessions_select" ON "results_entry_sessions"
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "results_entry_sessions_write" ON "results_entry_sessions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text IN ('event_director', 'admin', 'judge'))
        );
    `);

    // --- COMPETITION_FORMATS ---
    this.addSql(`
      CREATE POLICY "competition_formats_select" ON "competition_formats"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "competition_formats_admin" ON "competition_formats"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- CLASS_NAME_MAPPINGS ---
    this.addSql(`
      CREATE POLICY "class_name_mappings_select" ON "class_name_mappings"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "class_name_mappings_admin" ON "class_name_mappings"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);

    // --- MEMBERSHIP_TYPE_CONFIGS ---
    this.addSql(`
      CREATE POLICY "membership_type_configs_select" ON "membership_type_configs"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "membership_type_configs_admin" ON "membership_type_configs"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role::text = 'admin')
        );
    `);
  }

  async down(): Promise<void> {
    // No down migration - this is a cleanup migration
  }
}
