import { Migration } from '@mikro-orm/migrations';

/**
 * Comprehensive migration to fix ALL RLS performance warnings
 *
 * This migration:
 * 1. Drops ALL existing RLS policies
 * 2. Recreates them using (SELECT auth.uid()) and (SELECT auth.jwt()) caching
 * 3. Uses correct column names for each table
 * 4. Consolidates duplicate policies to avoid "Multiple Permissive Policies" warnings
 *
 * Column name reference:
 * - orders: member_id
 * - subscriptions: member_id
 * - messages: from_user_id, to_user_id
 * - member_gallery_images: member_id
 * - user_permission_overrides: user_id
 * - communication_log: member_id, sent_by
 * - invoices: user_id
 * - memberships: user_id
 * - notifications: user_id, from_user_id
 * - shop_orders: user_id
 * - teams: owner_id
 * - team_members: member_id, user_id (both exist)
 */
export class Migration20260121200000_fix_all_rls_performance extends Migration {
  async up(): Promise<void> {
    // =========================================================================
    // PERMISSIONS TABLE - public read, admin write
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage permissions" ON "permissions";`);
    this.addSql(`DROP POLICY IF EXISTS "permissions_select" ON "permissions";`);
    this.addSql(`DROP POLICY IF EXISTS "permissions_all" ON "permissions";`);
    this.addSql(`DROP POLICY IF EXISTS "Anyone can view permissions" ON "permissions";`);

    this.addSql(`
      CREATE POLICY "permissions_public_read" ON "permissions"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "permissions_admin_write" ON "permissions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // ROLE_PERMISSIONS TABLE - public read, admin write
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage role permissions" ON "role_permissions";`);
    this.addSql(`DROP POLICY IF EXISTS "role_permissions_select" ON "role_permissions";`);
    this.addSql(`DROP POLICY IF EXISTS "role_permissions_all" ON "role_permissions";`);
    this.addSql(`DROP POLICY IF EXISTS "Anyone can view role permissions" ON "role_permissions";`);

    this.addSql(`
      CREATE POLICY "role_permissions_public_read" ON "role_permissions"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "role_permissions_admin_write" ON "role_permissions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // USER_PERMISSION_OVERRIDES TABLE - user can view own, admin can manage
    // Column: user_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage permission overrides" ON "user_permission_overrides";`);
    this.addSql(`DROP POLICY IF EXISTS "user_permission_overrides_select" ON "user_permission_overrides";`);
    this.addSql(`DROP POLICY IF EXISTS "user_permission_overrides_all" ON "user_permission_overrides";`);
    this.addSql(`DROP POLICY IF EXISTS "Users can view own permission overrides" ON "user_permission_overrides";`);

    this.addSql(`
      CREATE POLICY "user_permission_overrides_read" ON "user_permission_overrides"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "user_permission_overrides_admin_write" ON "user_permission_overrides"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // MEMBERSHIP_TYPES TABLE - public read, admin write
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Anyone can view membership types" ON "membership_types";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage membership types" ON "membership_types";`);
    this.addSql(`DROP POLICY IF EXISTS "membership_types_select" ON "membership_types";`);
    this.addSql(`DROP POLICY IF EXISTS "membership_types_all" ON "membership_types";`);

    this.addSql(`
      CREATE POLICY "membership_types_public_read" ON "membership_types"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "membership_types_admin_write" ON "membership_types"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // ORDERS TABLE - user can view own, admin can manage
    // Column: member_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Users can view own orders" ON "orders";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage orders" ON "orders";`);
    this.addSql(`DROP POLICY IF EXISTS "orders_select" ON "orders";`);
    this.addSql(`DROP POLICY IF EXISTS "orders_insert" ON "orders";`);
    this.addSql(`DROP POLICY IF EXISTS "orders_update" ON "orders";`);

    this.addSql(`
      CREATE POLICY "orders_read" ON "orders"
        FOR SELECT USING (
          member_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "orders_insert" ON "orders"
        FOR INSERT WITH CHECK (
          member_id = (SELECT auth.uid())
          OR member_id IS NULL
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "orders_admin_update" ON "orders"
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "orders_admin_delete" ON "orders"
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // ORDER_ITEMS TABLE - user can view own (via order), admin can manage
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Users can view own order items" ON "order_items";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage order items" ON "order_items";`);

    this.addSql(`
      CREATE POLICY "order_items_read" ON "order_items"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND (orders.member_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'))
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "order_items_admin_write" ON "order_items"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // INVOICES TABLE - user can view own, admin can manage
    // Column: user_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Users can view own invoices" ON "invoices";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage invoices" ON "invoices";`);

    this.addSql(`
      CREATE POLICY "invoices_read" ON "invoices"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "invoices_admin_write" ON "invoices"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // INVOICE_ITEMS TABLE - via invoice access
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "invoice_items_read" ON "invoice_items";`);
    this.addSql(`DROP POLICY IF EXISTS "invoice_items_admin_write" ON "invoice_items";`);

    this.addSql(`
      CREATE POLICY "invoice_items_read" ON "invoice_items"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND (invoices.user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'))
          )
        );
    `);
    this.addSql(`
      CREATE POLICY "invoice_items_admin_write" ON "invoice_items"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // MEMBERSHIPS TABLE - user can view own, admin can manage
    // Column: user_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Users can view own memberships" ON "memberships";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage memberships" ON "memberships";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can create memberships" ON "memberships";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can update memberships" ON "memberships";`);

    this.addSql(`
      CREATE POLICY "memberships_read" ON "memberships"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "memberships_admin_write" ON "memberships"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // SUBSCRIPTIONS TABLE - user can view own, admin can manage
    // Column: member_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Users can view own subscriptions" ON "subscriptions";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage subscriptions" ON "subscriptions";`);
    this.addSql(`DROP POLICY IF EXISTS "subscriptions_select" ON "subscriptions";`);
    this.addSql(`DROP POLICY IF EXISTS "subscriptions_insert" ON "subscriptions";`);
    this.addSql(`DROP POLICY IF EXISTS "subscriptions_update" ON "subscriptions";`);

    this.addSql(`
      CREATE POLICY "subscriptions_read" ON "subscriptions"
        FOR SELECT USING (
          member_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "subscriptions_admin_write" ON "subscriptions"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // TEAMS TABLE - public can view active teams, captain/admin can write
    // Column: captain_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Anyone can view teams" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "Owners and admins can manage teams" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "teams_select" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "teams_insert" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "teams_update" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "teams_delete" ON "teams";`);

    this.addSql(`
      CREATE POLICY "teams_read" ON "teams"
        FOR SELECT USING (
          is_active = true
          OR captain_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "teams_captain_admin_write" ON "teams"
        FOR ALL USING (
          captain_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // TEAM_MEMBERS TABLE - public read, team captain/admin can write
    // Column: user_id for team member reference
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Anyone can view team members" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "Team owners can manage members" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "team_members_select" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "team_members_insert" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "team_members_update" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "team_members_delete" ON "team_members";`);

    this.addSql(`
      CREATE POLICY "team_members_public_read" ON "team_members"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "team_members_captain_admin_write" ON "team_members"
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = team_members.team_id
            AND (teams.captain_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'))
          )
        );
    `);

    // =========================================================================
    // MEMBER_GALLERY_IMAGES TABLE - public read, owner/admin can write
    // Column: member_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Anyone can view public gallery images" ON "member_gallery_images";`);
    this.addSql(`DROP POLICY IF EXISTS "Users can manage own gallery" ON "member_gallery_images";`);
    this.addSql(`DROP POLICY IF EXISTS "member_gallery_images_select" ON "member_gallery_images";`);
    this.addSql(`DROP POLICY IF EXISTS "member_gallery_images_insert" ON "member_gallery_images";`);
    this.addSql(`DROP POLICY IF EXISTS "member_gallery_images_update" ON "member_gallery_images";`);
    this.addSql(`DROP POLICY IF EXISTS "member_gallery_images_delete" ON "member_gallery_images";`);

    this.addSql(`
      CREATE POLICY "member_gallery_images_public_read" ON "member_gallery_images"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "member_gallery_images_owner_admin_write" ON "member_gallery_images"
        FOR ALL USING (
          member_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // MESSAGES TABLE - user can view sent/received, user can send
    // Columns: from_user_id, to_user_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Users can view own messages" ON "messages";`);
    this.addSql(`DROP POLICY IF EXISTS "Users can send messages" ON "messages";`);
    this.addSql(`DROP POLICY IF EXISTS "Users can update own received messages" ON "messages";`);
    this.addSql(`DROP POLICY IF EXISTS "messages_select" ON "messages";`);
    this.addSql(`DROP POLICY IF EXISTS "messages_insert" ON "messages";`);
    this.addSql(`DROP POLICY IF EXISTS "messages_update" ON "messages";`);

    this.addSql(`
      CREATE POLICY "messages_read" ON "messages"
        FOR SELECT USING (
          from_user_id = (SELECT auth.uid())
          OR to_user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "messages_insert" ON "messages"
        FOR INSERT WITH CHECK (
          from_user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "messages_update" ON "messages"
        FOR UPDATE USING (
          to_user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // COMMUNICATION_LOG TABLE - admin only (backend uses service role)
    // Columns: member_id, sent_by
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Admins can view communication log" ON "communication_log";`);
    this.addSql(`DROP POLICY IF EXISTS "System can insert communication log" ON "communication_log";`);
    this.addSql(`DROP POLICY IF EXISTS "communication_log_select_policy" ON "communication_log";`);
    this.addSql(`DROP POLICY IF EXISTS "communication_log_insert_policy" ON "communication_log";`);
    this.addSql(`DROP POLICY IF EXISTS "communication_log_update_policy" ON "communication_log";`);

    this.addSql(`
      CREATE POLICY "communication_log_admin_all" ON "communication_log"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // NOTIFICATIONS TABLE - user can view/update/delete own, authenticated can create
    // Column: user_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Users can view own notifications" ON "notifications";`);
    this.addSql(`DROP POLICY IF EXISTS "Users can update own notifications" ON "notifications";`);
    this.addSql(`DROP POLICY IF EXISTS "Users can delete own notifications" ON "notifications";`);
    this.addSql(`DROP POLICY IF EXISTS "Authenticated users can create notifications" ON "notifications";`);

    this.addSql(`
      CREATE POLICY "notifications_read" ON "notifications"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "notifications_update" ON "notifications"
        FOR UPDATE USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "notifications_delete" ON "notifications"
        FOR DELETE USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "notifications_insert" ON "notifications"
        FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    `);

    // =========================================================================
    // PROFILES TABLE - public read, user can update own
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON "profiles";`);
    this.addSql(`DROP POLICY IF EXISTS "Users can update own profile" ON "profiles";`);
    this.addSql(`DROP POLICY IF EXISTS "Users can insert own profile" ON "profiles";`);

    this.addSql(`
      CREATE POLICY "profiles_public_read" ON "profiles"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "profiles_update_own" ON "profiles"
        FOR UPDATE USING (
          id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "profiles_insert_own" ON "profiles"
        FOR INSERT WITH CHECK (id = (SELECT auth.uid()));
    `);

    // =========================================================================
    // EVENTS TABLE - public read, ED/admin can manage
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Events are viewable by everyone" ON "events";`);
    this.addSql(`DROP POLICY IF EXISTS "Event directors can create events" ON "events";`);
    this.addSql(`DROP POLICY IF EXISTS "Event directors can update own events" ON "events";`);

    this.addSql(`
      CREATE POLICY "events_public_read" ON "events"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "events_ed_admin_insert" ON "events"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "events_ed_admin_update" ON "events"
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "events_admin_delete" ON "events"
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // EVENT_REGISTRATIONS TABLE - user can view own, ED/admin can manage
    // Column: user_id
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Users can view own registrations" ON "event_registrations";`);
    this.addSql(`DROP POLICY IF EXISTS "Anyone can create registrations" ON "event_registrations";`);
    this.addSql(`DROP POLICY IF EXISTS "Event directors can update registrations" ON "event_registrations";`);

    this.addSql(`
      CREATE POLICY "event_registrations_read" ON "event_registrations"
        FOR SELECT USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "event_registrations_insert" ON "event_registrations"
        FOR INSERT WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY "event_registrations_update" ON "event_registrations"
        FOR UPDATE USING (
          user_id = (SELECT auth.uid())
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "event_registrations_delete" ON "event_registrations"
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role::text IN ('event_director', 'admin', 'judge'))
        );
    `);

    // =========================================================================
    // COMPETITION_RESULTS TABLE - public read, ED/admin can manage
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Results are viewable by everyone" ON "competition_results";`);
    this.addSql(`DROP POLICY IF EXISTS "Event directors and admins can create results" ON "competition_results";`);
    this.addSql(`DROP POLICY IF EXISTS "Event directors and admins can update results" ON "competition_results";`);

    this.addSql(`
      CREATE POLICY "competition_results_public_read" ON "competition_results"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "competition_results_ed_admin_insert" ON "competition_results"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "competition_results_ed_admin_update" ON "competition_results"
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role::text IN ('event_director', 'admin', 'judge'))
        );
    `);
    this.addSql(`
      CREATE POLICY "competition_results_admin_delete" ON "competition_results"
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // SEASONS TABLE - public read, admin can manage
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Allow public read access to seasons" ON "seasons";`);
    this.addSql(`DROP POLICY IF EXISTS "Allow admins to manage seasons" ON "seasons";`);

    this.addSql(`
      CREATE POLICY "seasons_public_read" ON "seasons"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "seasons_admin_write" ON "seasons"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // COMPETITION_CLASSES TABLE - active classes public, all classes for admin
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Allow public read access to active classes" ON "competition_classes";`);
    this.addSql(`DROP POLICY IF EXISTS "Allow admins to read all classes" ON "competition_classes";`);
    this.addSql(`DROP POLICY IF EXISTS "Allow admins to manage classes" ON "competition_classes";`);

    this.addSql(`
      CREATE POLICY "competition_classes_public_read" ON "competition_classes"
        FOR SELECT USING (
          is_active = true
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "competition_classes_admin_write" ON "competition_classes"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // MEDIA_FILES TABLE - public read, admin can manage
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Allow public read access to media files" ON "media_files";`);
    this.addSql(`DROP POLICY IF EXISTS "Allow admins to manage media files" ON "media_files";`);

    this.addSql(`
      CREATE POLICY "media_files_public_read" ON "media_files"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "media_files_admin_write" ON "media_files"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // SITE_SETTINGS TABLE - public read, admin can manage
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Allow public read access to site settings" ON "site_settings";`);
    this.addSql(`DROP POLICY IF EXISTS "Allow admins to manage site settings" ON "site_settings";`);

    this.addSql(`
      CREATE POLICY "site_settings_public_read" ON "site_settings"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "site_settings_admin_write" ON "site_settings"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // RULEBOOKS TABLE - public read, admin can manage
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "Rulebooks are viewable by everyone" ON "rulebooks";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can create rulebooks" ON "rulebooks";`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can update rulebooks" ON "rulebooks";`);

    this.addSql(`
      CREATE POLICY "rulebooks_public_read" ON "rulebooks"
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY "rulebooks_admin_write" ON "rulebooks"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // BANNERS TABLE - active banners public, admin can manage
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "banners_select_policy" ON "banners";`);
    this.addSql(`DROP POLICY IF EXISTS "banners_insert_policy" ON "banners";`);
    this.addSql(`DROP POLICY IF EXISTS "banners_update_policy" ON "banners";`);
    this.addSql(`DROP POLICY IF EXISTS "banners_delete_policy" ON "banners";`);

    this.addSql(`
      CREATE POLICY "banners_read" ON "banners"
        FOR SELECT USING (
          (status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);
    this.addSql(`
      CREATE POLICY "banners_admin_write" ON "banners"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // ADVERTISERS TABLE - admin only
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "advertisers_select_policy" ON "advertisers";`);
    this.addSql(`DROP POLICY IF EXISTS "advertisers_insert_policy" ON "advertisers";`);
    this.addSql(`DROP POLICY IF EXISTS "advertisers_update_policy" ON "advertisers";`);
    this.addSql(`DROP POLICY IF EXISTS "advertisers_delete_policy" ON "advertisers";`);

    this.addSql(`
      CREATE POLICY "advertisers_admin_all" ON "advertisers"
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')
        );
    `);

    // =========================================================================
    // BANNER_ENGAGEMENTS TABLE - public access for engagement tracking
    // =========================================================================
    this.addSql(`DROP POLICY IF EXISTS "banner_engagements_select_policy" ON "banner_engagements";`);
    this.addSql(`DROP POLICY IF EXISTS "banner_engagements_insert_policy" ON "banner_engagements";`);
    this.addSql(`DROP POLICY IF EXISTS "banner_engagements_update_policy" ON "banner_engagements";`);

    this.addSql(`
      CREATE POLICY "banner_engagements_read" ON "banner_engagements"
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_engagements.banner_id)
        );
    `);
    this.addSql(`
      CREATE POLICY "banner_engagements_insert" ON "banner_engagements"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_id)
        );
    `);
    this.addSql(`
      CREATE POLICY "banner_engagements_update" ON "banner_engagements"
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM banners WHERE banners.id = banner_engagements.banner_id)
        );
    `);

    // =========================================================================
    // Drop deprecated helper functions from previous migration
    // =========================================================================
    this.addSql(`DROP FUNCTION IF EXISTS public.is_admin();`);
    this.addSql(`DROP FUNCTION IF EXISTS public.auth_role();`);
    this.addSql(`DROP FUNCTION IF EXISTS public.auth_uid();`);
  }

  async down(): Promise<void> {
    // This is a comprehensive policy overhaul - rolling back would require
    // restoring all original policies which is complex. In practice, this
    // migration should not need to be rolled back.

    // Recreate helper functions if needed
    this.addSql(`
      CREATE OR REPLACE FUNCTION public.auth_uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $$ SELECT auth.uid(); $$;
    `);
  }
}
