import { Migration } from '@mikro-orm/migrations';

/**
 * This migration fixes the "Auth RLS Initialization Plan" performance warnings.
 *
 * The issue: auth.uid() calls inside subqueries were not being cached.
 * The fix: Ensure ALL auth.uid() calls use (SELECT auth.uid()) pattern, even inside subqueries.
 *
 * Previous code had:
 *   WHERE profiles.id = auth.uid()
 *
 * Fixed code uses:
 *   WHERE profiles.id = (SELECT auth.uid())
 *
 * NO FUNCTIONALITY IS REMOVED - all access patterns remain identical.
 */
export class Migration20260121500000_fix_auth_caching extends Migration {
  async up(): Promise<void> {
    // Cached auth.uid() - must be used EVERYWHERE
    const CACHED_UID = '(SELECT auth.uid())';

    // Properly cached IS_ADMIN check - auth.uid() is now cached inside the subquery
    const IS_ADMIN = `(SELECT COALESCE((SELECT role::text FROM profiles WHERE id = ${CACHED_UID}) = 'admin', false))`;

    // Properly cached IS_AUTHENTICATED check
    const IS_AUTHENTICATED = `${CACHED_UID} IS NOT NULL`;

    // Properly cached event director or admin check
    const isEventDirectorOrAdmin = `(
      ${IS_ADMIN} OR
      EXISTS (
        SELECT 1 FROM event_directors ed
        WHERE ed.user_id = ${CACHED_UID}
        AND ed.is_active = true
      )
    )`;

    // All tables that have policies
    const allTables = [
      'achievement_definitions',
      'achievement_recipients',
      'achievement_templates',
      'advertisers',
      'banner_engagements',
      'banners',
      'championship_archives',
      'championship_awards',
      'class_name_mappings',
      'communication_log',
      'competition_classes',
      'competition_formats',
      'competition_results',
      'contact_submissions',
      'event_director_applications',
      'event_director_assignments',
      'event_directors',
      'event_hosting_request_messages',
      'event_hosting_requests',
      'event_judge_assignments',
      'event_registration_classes',
      'event_registrations',
      'events',
      'invoice_items',
      'invoices',
      'judge_applications',
      'judges',
      'manufacturer_listings',
      'meca_id_history',
      'media_files',
      'member_gallery_images',
      'membership_type_configs',
      'membership_types',
      'memberships',
      'messages',
      'notifications',
      'order_items',
      'orders',
      'payments',
      'permissions',
      'profiles',
      'ratings',
      'results_audit_log',
      'results_entry_sessions',
      'retailer_listings',
      'role_permissions',
      'rulebooks',
      'seasons',
      'shop_order_items',
      'shop_orders',
      'shop_products',
      'site_settings',
      'subscriptions',
      'team_members',
      'teams',
      'ticket_comments',
      'tickets',
      'training_records',
      'user_permission_overrides',
      'world_finals_qualifications',
    ];

    // ==========================================================================
    // STEP 1: DROP ALL EXISTING POLICIES
    // ==========================================================================
    for (const table of allTables) {
      this.addSql(`DROP POLICY IF EXISTS "${table}_select" ON "${table}";`);
      this.addSql(`DROP POLICY IF EXISTS "${table}_insert" ON "${table}";`);
      this.addSql(`DROP POLICY IF EXISTS "${table}_update" ON "${table}";`);
      this.addSql(`DROP POLICY IF EXISTS "${table}_delete" ON "${table}";`);
      this.addSql(`DROP POLICY IF EXISTS "${table}_policy" ON "${table}";`);
    }

    // ==========================================================================
    // STEP 2: CREATE PROPERLY CACHED POLICIES
    // ==========================================================================

    // -------------------------------------------------------------------------
    // PATTERN A: Admin-only tables (use only FOR ALL)
    // -------------------------------------------------------------------------
    const adminOnlyTables = [
      'advertisers',
      'communication_log',
      'training_records',
      'user_permission_overrides',
    ];

    for (const table of adminOnlyTables) {
      this.addSql(`
        CREATE POLICY "${table}_policy" ON "${table}"
          FOR ALL USING (${IS_ADMIN});
      `);
    }

    // -------------------------------------------------------------------------
    // PATTERN B: Public read, admin write
    // -------------------------------------------------------------------------
    const publicReadAdminWrite = [
      'achievement_definitions',
      'achievement_recipients',
      'achievement_templates',
      'championship_archives',
      'championship_awards',
      'class_name_mappings',
      'competition_classes',
      'competition_formats',
      'event_director_assignments',
      'event_directors',
      'event_judge_assignments',
      'judges',
      'manufacturer_listings',
      'media_files',
      'membership_type_configs',
      'membership_types',
      'permissions',
      'role_permissions',
      'rulebooks',
      'seasons',
      'shop_products',
      'site_settings',
      'world_finals_qualifications',
    ];

    for (const table of publicReadAdminWrite) {
      this.addSql(`
        CREATE POLICY "${table}_select" ON "${table}"
          FOR SELECT USING (true);
      `);
      this.addSql(`
        CREATE POLICY "${table}_insert" ON "${table}"
          FOR INSERT WITH CHECK (${IS_ADMIN});
      `);
      this.addSql(`
        CREATE POLICY "${table}_update" ON "${table}"
          FOR UPDATE USING (${IS_ADMIN});
      `);
      this.addSql(`
        CREATE POLICY "${table}_delete" ON "${table}"
          FOR DELETE USING (${IS_ADMIN});
      `);
    }

    // -------------------------------------------------------------------------
    // PATTERN C: Banners - Public read active, admin write
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "banners_select" ON "banners"
        FOR SELECT USING (
          (status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)
          OR ${IS_ADMIN}
        );
    `);
    this.addSql(`
      CREATE POLICY "banners_insert" ON "banners"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "banners_update" ON "banners"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "banners_delete" ON "banners"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN D: Banner engagements - Public access with validation
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "banner_engagements_select" ON "banner_engagements"
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_engagements.banner_id)
        );
    `);
    this.addSql(`
      CREATE POLICY "banner_engagements_insert" ON "banner_engagements"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_id AND banners.status = 'active')
        );
    `);
    this.addSql(`
      CREATE POLICY "banner_engagements_update" ON "banner_engagements"
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_engagements.banner_id)
        );
    `);

    // -------------------------------------------------------------------------
    // PATTERN E: Contact submissions - Public insert with validation
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "contact_submissions_select" ON "contact_submissions"
        FOR SELECT USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "contact_submissions_insert" ON "contact_submissions"
        FOR INSERT WITH CHECK (
          email IS NOT NULL AND message IS NOT NULL
        );
    `);
    this.addSql(`
      CREATE POLICY "contact_submissions_update" ON "contact_submissions"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "contact_submissions_delete" ON "contact_submissions"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN F: Profiles - Public read, own write
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "profiles_select" ON "profiles"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "profiles_insert" ON "profiles"
        FOR INSERT WITH CHECK (id = ${CACHED_UID});
    `);
    this.addSql(`
      CREATE POLICY "profiles_update" ON "profiles"
        FOR UPDATE USING (id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "profiles_delete" ON "profiles"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN G: Events - Public read, event director/admin write
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "events_select" ON "events"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "events_insert" ON "events"
        FOR INSERT WITH CHECK (${isEventDirectorOrAdmin});
    `);
    this.addSql(`
      CREATE POLICY "events_update" ON "events"
        FOR UPDATE USING (${isEventDirectorOrAdmin});
    `);
    this.addSql(`
      CREATE POLICY "events_delete" ON "events"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN H: Event registrations - Public read, authenticated insert
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "event_registrations_select" ON "event_registrations"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "event_registrations_insert" ON "event_registrations"
        FOR INSERT WITH CHECK (${IS_AUTHENTICATED});
    `);
    this.addSql(`
      CREATE POLICY "event_registrations_update" ON "event_registrations"
        FOR UPDATE USING (
          user_id = ${CACHED_UID} OR ${isEventDirectorOrAdmin}
        );
    `);
    this.addSql(`
      CREATE POLICY "event_registrations_delete" ON "event_registrations"
        FOR DELETE USING (
          user_id = ${CACHED_UID} OR ${IS_ADMIN}
        );
    `);

    // -------------------------------------------------------------------------
    // PATTERN I: Event registration classes
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "event_registration_classes_select" ON "event_registration_classes"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "event_registration_classes_insert" ON "event_registration_classes"
        FOR INSERT WITH CHECK (${IS_AUTHENTICATED});
    `);
    this.addSql(`
      CREATE POLICY "event_registration_classes_update" ON "event_registration_classes"
        FOR UPDATE USING (${isEventDirectorOrAdmin});
    `);
    this.addSql(`
      CREATE POLICY "event_registration_classes_delete" ON "event_registration_classes"
        FOR DELETE USING (${isEventDirectorOrAdmin});
    `);

    // -------------------------------------------------------------------------
    // PATTERN J: Competition results - Public read, event director/admin write
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "competition_results_select" ON "competition_results"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "competition_results_insert" ON "competition_results"
        FOR INSERT WITH CHECK (${isEventDirectorOrAdmin});
    `);
    this.addSql(`
      CREATE POLICY "competition_results_update" ON "competition_results"
        FOR UPDATE USING (${isEventDirectorOrAdmin});
    `);
    this.addSql(`
      CREATE POLICY "competition_results_delete" ON "competition_results"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN K: Results entry sessions
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "results_entry_sessions_select" ON "results_entry_sessions"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "results_entry_sessions_insert" ON "results_entry_sessions"
        FOR INSERT WITH CHECK (${isEventDirectorOrAdmin});
    `);
    this.addSql(`
      CREATE POLICY "results_entry_sessions_update" ON "results_entry_sessions"
        FOR UPDATE USING (${isEventDirectorOrAdmin});
    `);
    this.addSql(`
      CREATE POLICY "results_entry_sessions_delete" ON "results_entry_sessions"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN L: Results audit log - Insert for ED, read for admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "results_audit_log_select" ON "results_audit_log"
        FOR SELECT USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "results_audit_log_insert" ON "results_audit_log"
        FOR INSERT WITH CHECK (${isEventDirectorOrAdmin});
    `);

    // -------------------------------------------------------------------------
    // PATTERN M: Tickets - Own or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "tickets_select" ON "tickets"
        FOR SELECT USING (
          reporter_id = ${CACHED_UID} OR
          assigned_to_id = ${CACHED_UID} OR
          ${IS_ADMIN}
        );
    `);
    this.addSql(`
      CREATE POLICY "tickets_insert" ON "tickets"
        FOR INSERT WITH CHECK (${IS_AUTHENTICATED});
    `);
    this.addSql(`
      CREATE POLICY "tickets_update" ON "tickets"
        FOR UPDATE USING (
          reporter_id = ${CACHED_UID} OR
          assigned_to_id = ${CACHED_UID} OR
          ${IS_ADMIN}
        );
    `);
    this.addSql(`
      CREATE POLICY "tickets_delete" ON "tickets"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN N: Ticket comments - View related tickets, authenticated insert
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "ticket_comments_select" ON "ticket_comments"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_comments.ticket_id
            AND (t.reporter_id = ${CACHED_UID} OR t.assigned_to_id = ${CACHED_UID} OR ${IS_ADMIN})
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "ticket_comments_insert" ON "ticket_comments"
        FOR INSERT WITH CHECK (${IS_AUTHENTICATED});
    `);
    this.addSql(`
      CREATE POLICY "ticket_comments_update" ON "ticket_comments"
        FOR UPDATE USING (
          author_id = ${CACHED_UID} OR ${IS_ADMIN}
        );
    `);
    this.addSql(`
      CREATE POLICY "ticket_comments_delete" ON "ticket_comments"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN O: Messages - Own messages only
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "messages_select" ON "messages"
        FOR SELECT USING (
          from_user_id = ${CACHED_UID} OR to_user_id = ${CACHED_UID} OR ${IS_ADMIN}
        );
    `);
    this.addSql(`
      CREATE POLICY "messages_insert" ON "messages"
        FOR INSERT WITH CHECK (from_user_id = ${CACHED_UID});
    `);
    this.addSql(`
      CREATE POLICY "messages_update" ON "messages"
        FOR UPDATE USING (
          from_user_id = ${CACHED_UID} OR to_user_id = ${CACHED_UID}
        );
    `);
    this.addSql(`
      CREATE POLICY "messages_delete" ON "messages"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN P: Notifications - Own notifications
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "notifications_select" ON "notifications"
        FOR SELECT USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "notifications_insert" ON "notifications"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "notifications_update" ON "notifications"
        FOR UPDATE USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "notifications_delete" ON "notifications"
        FOR DELETE USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN Q: Orders - Own orders or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "orders_select" ON "orders"
        FOR SELECT USING (member_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "orders_insert" ON "orders"
        FOR INSERT WITH CHECK (member_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "orders_update" ON "orders"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "orders_delete" ON "orders"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN R: Order items - Own order items or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "order_items_select" ON "order_items"
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.member_id = ${CACHED_UID} OR ${IS_ADMIN}))
        );
    `);
    this.addSql(`
      CREATE POLICY "order_items_insert" ON "order_items"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "order_items_update" ON "order_items"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "order_items_delete" ON "order_items"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN S: Invoices - Own invoices or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "invoices_select" ON "invoices"
        FOR SELECT USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "invoices_insert" ON "invoices"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "invoices_update" ON "invoices"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "invoices_delete" ON "invoices"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN T: Invoice items
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "invoice_items_select" ON "invoice_items"
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND (invoices.user_id = ${CACHED_UID} OR ${IS_ADMIN}))
        );
    `);
    this.addSql(`
      CREATE POLICY "invoice_items_insert" ON "invoice_items"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "invoice_items_update" ON "invoice_items"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "invoice_items_delete" ON "invoice_items"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN U: Payments - Own payments or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "payments_select" ON "payments"
        FOR SELECT USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "payments_insert" ON "payments"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "payments_update" ON "payments"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "payments_delete" ON "payments"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN V: Memberships - Own or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "memberships_select" ON "memberships"
        FOR SELECT USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "memberships_insert" ON "memberships"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "memberships_update" ON "memberships"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "memberships_delete" ON "memberships"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN W: Subscriptions - Own or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "subscriptions_select" ON "subscriptions"
        FOR SELECT USING (member_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "subscriptions_insert" ON "subscriptions"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "subscriptions_update" ON "subscriptions"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "subscriptions_delete" ON "subscriptions"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN X: Teams - Public read, captain/admin write
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "teams_select" ON "teams"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "teams_insert" ON "teams"
        FOR INSERT WITH CHECK (captain_id = ${CACHED_UID});
    `);
    this.addSql(`
      CREATE POLICY "teams_update" ON "teams"
        FOR UPDATE USING (captain_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "teams_delete" ON "teams"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN Y: Team members - Public read, captain/admin write
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "team_members_select" ON "team_members"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "team_members_insert" ON "team_members"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.captain_id = ${CACHED_UID})
          OR ${IS_ADMIN}
        );
    `);
    this.addSql(`
      CREATE POLICY "team_members_update" ON "team_members"
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.captain_id = ${CACHED_UID})
          OR ${IS_ADMIN}
        );
    `);
    this.addSql(`
      CREATE POLICY "team_members_delete" ON "team_members"
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.captain_id = ${CACHED_UID})
          OR ${IS_ADMIN}
        );
    `);

    // -------------------------------------------------------------------------
    // PATTERN Z: Member gallery images - Own or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "member_gallery_images_select" ON "member_gallery_images"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "member_gallery_images_insert" ON "member_gallery_images"
        FOR INSERT WITH CHECK (member_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "member_gallery_images_update" ON "member_gallery_images"
        FOR UPDATE USING (member_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "member_gallery_images_delete" ON "member_gallery_images"
        FOR DELETE USING (member_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN AA: MECA ID History
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "meca_id_history_select" ON "meca_id_history"
        FOR SELECT USING (profile_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "meca_id_history_insert" ON "meca_id_history"
        FOR INSERT WITH CHECK (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "meca_id_history_update" ON "meca_id_history"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "meca_id_history_delete" ON "meca_id_history"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN AB: Ratings - Public read, own write
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "ratings_select" ON "ratings"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "ratings_insert" ON "ratings"
        FOR INSERT WITH CHECK (rater_user_id = ${CACHED_UID});
    `);
    this.addSql(`
      CREATE POLICY "ratings_update" ON "ratings"
        FOR UPDATE USING (rater_user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "ratings_delete" ON "ratings"
        FOR DELETE USING (rater_user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN AC: Retailer listings - Public read, own/admin write
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "retailer_listings_select" ON "retailer_listings"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "retailer_listings_insert" ON "retailer_listings"
        FOR INSERT WITH CHECK (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "retailer_listings_update" ON "retailer_listings"
        FOR UPDATE USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "retailer_listings_delete" ON "retailer_listings"
        FOR DELETE USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN AD: Judge/ED applications - Own insert, admin manage
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "judge_applications_select" ON "judge_applications"
        FOR SELECT USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "judge_applications_insert" ON "judge_applications"
        FOR INSERT WITH CHECK (user_id = ${CACHED_UID});
    `);
    this.addSql(`
      CREATE POLICY "judge_applications_update" ON "judge_applications"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "judge_applications_delete" ON "judge_applications"
        FOR DELETE USING (${IS_ADMIN});
    `);

    this.addSql(`
      CREATE POLICY "event_director_applications_select" ON "event_director_applications"
        FOR SELECT USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "event_director_applications_insert" ON "event_director_applications"
        FOR INSERT WITH CHECK (user_id = ${CACHED_UID});
    `);
    this.addSql(`
      CREATE POLICY "event_director_applications_update" ON "event_director_applications"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "event_director_applications_delete" ON "event_director_applications"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN AE: Event hosting requests
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "event_hosting_requests_select" ON "event_hosting_requests"
        FOR SELECT USING (
          user_id = ${CACHED_UID} OR ${isEventDirectorOrAdmin}
        );
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_requests_insert" ON "event_hosting_requests"
        FOR INSERT WITH CHECK (${IS_AUTHENTICATED});
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_requests_update" ON "event_hosting_requests"
        FOR UPDATE USING (
          user_id = ${CACHED_UID} OR ${isEventDirectorOrAdmin}
        );
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_requests_delete" ON "event_hosting_requests"
        FOR DELETE USING (${IS_ADMIN});
    `);

    this.addSql(`
      CREATE POLICY "event_hosting_request_messages_select" ON "event_hosting_request_messages"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM event_hosting_requests ehr
            WHERE ehr.id = event_hosting_request_messages.request_id
            AND (ehr.user_id = ${CACHED_UID} OR ${isEventDirectorOrAdmin})
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_request_messages_insert" ON "event_hosting_request_messages"
        FOR INSERT WITH CHECK (${IS_AUTHENTICATED});
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_request_messages_update" ON "event_hosting_request_messages"
        FOR UPDATE USING (sender_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_request_messages_delete" ON "event_hosting_request_messages"
        FOR DELETE USING (${IS_ADMIN});
    `);

    // -------------------------------------------------------------------------
    // PATTERN AF: Shop orders - Own or admin
    // -------------------------------------------------------------------------
    this.addSql(`
      CREATE POLICY "shop_orders_select" ON "shop_orders"
        FOR SELECT USING (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "shop_orders_insert" ON "shop_orders"
        FOR INSERT WITH CHECK (user_id = ${CACHED_UID} OR ${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "shop_orders_update" ON "shop_orders"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "shop_orders_delete" ON "shop_orders"
        FOR DELETE USING (${IS_ADMIN});
    `);

    this.addSql(`
      CREATE POLICY "shop_order_items_select" ON "shop_order_items"
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = shop_order_items.order_id AND (shop_orders.user_id = ${CACHED_UID} OR ${IS_ADMIN}))
        );
    `);
    this.addSql(`
      CREATE POLICY "shop_order_items_insert" ON "shop_order_items"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = shop_order_items.order_id AND (shop_orders.user_id = ${CACHED_UID} OR ${IS_ADMIN}))
        );
    `);
    this.addSql(`
      CREATE POLICY "shop_order_items_update" ON "shop_order_items"
        FOR UPDATE USING (${IS_ADMIN});
    `);
    this.addSql(`
      CREATE POLICY "shop_order_items_delete" ON "shop_order_items"
        FOR DELETE USING (${IS_ADMIN});
    `);
  }

  async down(): Promise<void> {
    throw new Error('Down migration not supported - run previous migration to revert');
  }
}
