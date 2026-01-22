import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Fix RLS Security Warnings
 *
 * Fixes "RLS Policy Always True" security warnings by replacing
 * USING(true) and WITH CHECK(true) with proper access controls.
 *
 * Categories:
 * 1. Admin-only tables - require admin role
 * 2. User-owned tables - owner OR admin
 * 3. Event management - admin OR event director
 * 4. Public submissions - authenticated insert, owner/admin update/delete
 */
export class Migration20260115220000_fix_rls_security_warnings extends Migration {
  async up(): Promise<void> {
    // =========================================================================
    // ADMIN-ONLY TABLES
    // These tables should only be modifiable by admins
    // =========================================================================

    // competition_formats - admin only
    this.addSql(`DROP POLICY IF EXISTS "competition_formats_insert" ON "competition_formats";`);
    this.addSql(`DROP POLICY IF EXISTS "competition_formats_update" ON "competition_formats";`);
    this.addSql(`
      CREATE POLICY "competition_formats_insert" ON "competition_formats"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "competition_formats_update" ON "competition_formats"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // seasons - admin only
    this.addSql(`DROP POLICY IF EXISTS "seasons_insert" ON "seasons";`);
    this.addSql(`DROP POLICY IF EXISTS "seasons_update" ON "seasons";`);
    this.addSql(`
      CREATE POLICY "seasons_insert" ON "seasons"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "seasons_update" ON "seasons"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // site_settings - admin only
    this.addSql(`DROP POLICY IF EXISTS "site_settings_update" ON "site_settings";`);
    this.addSql(`
      CREATE POLICY "site_settings_update" ON "site_settings"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // rulebooks - admin only
    this.addSql(`DROP POLICY IF EXISTS "rulebooks_insert" ON "rulebooks";`);
    this.addSql(`DROP POLICY IF EXISTS "rulebooks_update" ON "rulebooks";`);
    this.addSql(`
      CREATE POLICY "rulebooks_insert" ON "rulebooks"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "rulebooks_update" ON "rulebooks"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // membership_type_configs - admin only
    this.addSql(`DROP POLICY IF EXISTS "membership_type_configs_insert" ON "membership_type_configs";`);
    this.addSql(`DROP POLICY IF EXISTS "membership_type_configs_update" ON "membership_type_configs";`);
    this.addSql(`
      CREATE POLICY "membership_type_configs_insert" ON "membership_type_configs"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "membership_type_configs_update" ON "membership_type_configs"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // moderated_images - admin only
    this.addSql(`DROP POLICY IF EXISTS "moderated_images_insert" ON "moderated_images";`);
    this.addSql(`DROP POLICY IF EXISTS "moderated_images_update" ON "moderated_images";`);
    this.addSql(`
      CREATE POLICY "moderated_images_insert" ON "moderated_images"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "moderated_images_update" ON "moderated_images"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // moderation_log - admin only
    this.addSql(`DROP POLICY IF EXISTS "moderation_log_insert" ON "moderation_log";`);
    this.addSql(`
      CREATE POLICY "moderation_log_insert" ON "moderation_log"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // media_files - admin only
    this.addSql(`DROP POLICY IF EXISTS "media_files_insert" ON "media_files";`);
    this.addSql(`DROP POLICY IF EXISTS "media_files_update" ON "media_files";`);
    this.addSql(`DROP POLICY IF EXISTS "media_files_delete" ON "media_files";`);
    this.addSql(`
      CREATE POLICY "media_files_insert" ON "media_files"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "media_files_update" ON "media_files"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "media_files_delete" ON "media_files"
        FOR DELETE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // results_entry_sessions - admin only
    this.addSql(`DROP POLICY IF EXISTS "results_entry_sessions_insert" ON "results_entry_sessions";`);
    this.addSql(`DROP POLICY IF EXISTS "results_entry_sessions_update" ON "results_entry_sessions";`);
    this.addSql(`
      CREATE POLICY "results_entry_sessions_insert" ON "results_entry_sessions"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "results_entry_sessions_update" ON "results_entry_sessions"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // =========================================================================
    // TICKET SYSTEM TABLES - Admin only
    // =========================================================================

    // ticket_departments - admin only
    this.addSql(`DROP POLICY IF EXISTS "ticket_departments_insert" ON "ticket_departments";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_departments_update" ON "ticket_departments";`);
    this.addSql(`
      CREATE POLICY "ticket_departments_insert" ON "ticket_departments"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "ticket_departments_update" ON "ticket_departments"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // ticket_routing_rules - admin only
    this.addSql(`DROP POLICY IF EXISTS "ticket_routing_rules_insert" ON "ticket_routing_rules";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_routing_rules_update" ON "ticket_routing_rules";`);
    this.addSql(`
      CREATE POLICY "ticket_routing_rules_insert" ON "ticket_routing_rules"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "ticket_routing_rules_update" ON "ticket_routing_rules"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // ticket_settings - admin only
    this.addSql(`DROP POLICY IF EXISTS "ticket_settings_update" ON "ticket_settings";`);
    this.addSql(`
      CREATE POLICY "ticket_settings_update" ON "ticket_settings"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // ticket_staff - admin only
    this.addSql(`DROP POLICY IF EXISTS "ticket_staff_insert" ON "ticket_staff";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_staff_update" ON "ticket_staff";`);
    this.addSql(`
      CREATE POLICY "ticket_staff_insert" ON "ticket_staff"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "ticket_staff_update" ON "ticket_staff"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // ticket_staff_departments - admin only
    this.addSql(`DROP POLICY IF EXISTS "ticket_staff_departments_insert" ON "ticket_staff_departments";`);
    this.addSql(`
      CREATE POLICY "ticket_staff_departments_insert" ON "ticket_staff_departments"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // ticket_guest_tokens - admin only (system generated)
    this.addSql(`DROP POLICY IF EXISTS "ticket_guest_tokens_insert" ON "ticket_guest_tokens";`);
    this.addSql(`
      CREATE POLICY "ticket_guest_tokens_insert" ON "ticket_guest_tokens"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // =========================================================================
    // EVENT MANAGEMENT - Admin or Event Director
    // =========================================================================

    // events - admin or event_director role
    this.addSql(`DROP POLICY IF EXISTS "Events insert" ON "events";`);
    this.addSql(`DROP POLICY IF EXISTS "Events update" ON "events";`);
    this.addSql(`DROP POLICY IF EXISTS "Events delete" ON "events";`);
    this.addSql(`
      CREATE POLICY "Events insert" ON "events"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);
    this.addSql(`
      CREATE POLICY "Events update" ON "events"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);
    this.addSql(`
      CREATE POLICY "Events delete" ON "events"
        FOR DELETE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // competition_results - admin or event_director
    this.addSql(`DROP POLICY IF EXISTS "Competition results insert" ON "competition_results";`);
    this.addSql(`DROP POLICY IF EXISTS "Competition results update" ON "competition_results";`);
    this.addSql(`DROP POLICY IF EXISTS "Competition results delete" ON "competition_results";`);
    this.addSql(`
      CREATE POLICY "Competition results insert" ON "competition_results"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);
    this.addSql(`
      CREATE POLICY "Competition results update" ON "competition_results"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);
    this.addSql(`
      CREATE POLICY "Competition results delete" ON "competition_results"
        FOR DELETE USING ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);

    // event_judge_assignments - admin or event_director
    this.addSql(`DROP POLICY IF EXISTS "event_judge_assignments_insert" ON "event_judge_assignments";`);
    this.addSql(`DROP POLICY IF EXISTS "event_judge_assignments_update" ON "event_judge_assignments";`);
    this.addSql(`DROP POLICY IF EXISTS "event_judge_assignments_delete" ON "event_judge_assignments";`);
    this.addSql(`
      CREATE POLICY "event_judge_assignments_insert" ON "event_judge_assignments"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);
    this.addSql(`
      CREATE POLICY "event_judge_assignments_update" ON "event_judge_assignments"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);
    this.addSql(`
      CREATE POLICY "event_judge_assignments_delete" ON "event_judge_assignments"
        FOR DELETE USING ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);

    // =========================================================================
    // USER-OWNED TABLES - Owner or Admin
    // =========================================================================

    // memberships - user owns their membership or admin
    this.addSql(`DROP POLICY IF EXISTS "Memberships insert" ON "memberships";`);
    this.addSql(`DROP POLICY IF EXISTS "Memberships update all" ON "memberships";`);
    this.addSql(`DROP POLICY IF EXISTS "Memberships delete" ON "memberships";`);
    this.addSql(`
      CREATE POLICY "Memberships insert" ON "memberships"
        FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "Memberships update all" ON "memberships"
        FOR UPDATE USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "Memberships delete" ON "memberships"
        FOR DELETE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // notifications - user owns their notifications or admin
    this.addSql(`DROP POLICY IF EXISTS "Users can insert notifications" ON "notifications";`);
    this.addSql(`DROP POLICY IF EXISTS "Notifications update" ON "notifications";`);
    this.addSql(`DROP POLICY IF EXISTS "Notifications delete" ON "notifications";`);
    this.addSql(`
      CREATE POLICY "Users can insert notifications" ON "notifications"
        FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "Notifications update" ON "notifications"
        FOR UPDATE USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "Notifications delete" ON "notifications"
        FOR DELETE USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // orders - user owns their orders or admin
    this.addSql(`DROP POLICY IF EXISTS "Orders insert" ON "orders";`);
    this.addSql(`DROP POLICY IF EXISTS "Orders update" ON "orders";`);
    this.addSql(`
      CREATE POLICY "Orders insert" ON "orders"
        FOR INSERT WITH CHECK (member_id = (SELECT auth.uid()) OR member_id IS NULL OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "Orders update" ON "orders"
        FOR UPDATE USING (member_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // ratings - user can update their own rating
    this.addSql(`DROP POLICY IF EXISTS "ratings_update" ON "ratings";`);
    this.addSql(`
      CREATE POLICY "ratings_update" ON "ratings"
        FOR UPDATE USING (rater_user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // event_registrations - user owns their registration or admin
    this.addSql(`DROP POLICY IF EXISTS "Event registrations insert" ON "event_registrations";`);
    this.addSql(`DROP POLICY IF EXISTS "Event registrations update" ON "event_registrations";`);
    this.addSql(`DROP POLICY IF EXISTS "Event registrations delete" ON "event_registrations";`);
    this.addSql(`
      CREATE POLICY "Event registrations insert" ON "event_registrations"
        FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "Event registrations update" ON "event_registrations"
        FOR UPDATE USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);
    this.addSql(`
      CREATE POLICY "Event registrations delete" ON "event_registrations"
        FOR DELETE USING ((SELECT auth.jwt()) ->> 'role' IN ('admin', 'event_director'));
    `);

    // teams - owner or admin
    this.addSql(`DROP POLICY IF EXISTS "Teams insert" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "Teams update" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "Teams delete" ON "teams";`);
    this.addSql(`
      CREATE POLICY "Teams insert" ON "teams"
        FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "Teams update" ON "teams"
        FOR UPDATE USING (owner_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "Teams delete" ON "teams"
        FOR DELETE USING (owner_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // team_members - team owner or admin
    this.addSql(`DROP POLICY IF EXISTS "Team members insert" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "Team members update" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "Team members delete" ON "team_members";`);
    this.addSql(`
      CREATE POLICY "Team members insert" ON "team_members"
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.owner_id = (SELECT auth.uid()))
          OR (SELECT auth.jwt()) ->> 'role' = 'admin'
        );
    `);
    this.addSql(`
      CREATE POLICY "Team members update" ON "team_members"
        FOR UPDATE USING (
          EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.owner_id = (SELECT auth.uid()))
          OR (SELECT auth.jwt()) ->> 'role' = 'admin'
        );
    `);
    this.addSql(`
      CREATE POLICY "Team members delete" ON "team_members"
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.owner_id = (SELECT auth.uid()))
          OR (SELECT auth.jwt()) ->> 'role' = 'admin'
        );
    `);

    // =========================================================================
    // EVENT HOSTING REQUESTS - Owner or Admin
    // =========================================================================

    // event_hosting_requests - user owns their request or admin
    this.addSql(`DROP POLICY IF EXISTS "event_hosting_requests_insert" ON "event_hosting_requests";`);
    this.addSql(`DROP POLICY IF EXISTS "event_hosting_requests_update" ON "event_hosting_requests";`);
    this.addSql(`
      CREATE POLICY "event_hosting_requests_insert" ON "event_hosting_requests"
        FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);
    this.addSql(`
      CREATE POLICY "event_hosting_requests_update" ON "event_hosting_requests"
        FOR UPDATE USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // event_hosting_request_messages - owner of parent request or admin
    this.addSql(`DROP POLICY IF EXISTS "event_hosting_request_messages_insert" ON "event_hosting_request_messages";`);
    this.addSql(`
      CREATE POLICY "event_hosting_request_messages_insert" ON "event_hosting_request_messages"
        FOR INSERT WITH CHECK (
          sender_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM event_hosting_requests
            WHERE event_hosting_requests.id = event_hosting_request_messages.request_id
            AND event_hosting_requests.user_id = (SELECT auth.uid())
          )
          OR (SELECT auth.jwt()) ->> 'role' = 'admin'
        );
    `);

    // =========================================================================
    // TICKETS - User can create/manage their own tickets
    // =========================================================================

    // tickets - authenticated can insert, reporter or admin can update
    this.addSql(`DROP POLICY IF EXISTS "Users can create tickets" ON "tickets";`);
    this.addSql(`DROP POLICY IF EXISTS "tickets_update" ON "tickets";`);
    this.addSql(`
      CREATE POLICY "Users can create tickets" ON "tickets"
        FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL OR is_guest_ticket = true);
    `);
    this.addSql(`
      CREATE POLICY "tickets_update" ON "tickets"
        FOR UPDATE USING (reporter_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // ticket_comments - user can add to their own tickets or admin
    this.addSql(`DROP POLICY IF EXISTS "ticket_comments_insert" ON "ticket_comments";`);
    this.addSql(`
      CREATE POLICY "ticket_comments_insert" ON "ticket_comments"
        FOR INSERT WITH CHECK (
          author_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM tickets
            WHERE tickets.id = ticket_comments.ticket_id
            AND tickets.reporter_id = (SELECT auth.uid())
          )
          OR (SELECT auth.jwt()) ->> 'role' = 'admin'
        );
    `);

    // ticket_attachments - user can add to their own tickets or admin
    this.addSql(`DROP POLICY IF EXISTS "ticket_attachments_insert" ON "ticket_attachments";`);
    this.addSql(`
      CREATE POLICY "ticket_attachments_insert" ON "ticket_attachments"
        FOR INSERT WITH CHECK (
          uploader_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM tickets
            WHERE tickets.id = ticket_attachments.ticket_id
            AND tickets.reporter_id = (SELECT auth.uid())
          )
          OR (SELECT auth.jwt()) ->> 'role' = 'admin'
        );
    `);

    // =========================================================================
    // CONTACT SUBMISSIONS - Anyone can insert, admin manages
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "contact_submissions_insert" ON "contact_submissions";`);
    this.addSql(`
      CREATE POLICY "contact_submissions_insert" ON "contact_submissions"
        FOR INSERT WITH CHECK (true);
    `);
    // Note: contact_submissions INSERT remains true because it's a public contact form
    // This is intentional - unauthenticated users should be able to submit contact forms
  }

  async down(): Promise<void> {
    // Restore original permissive policies
    // Admin-only tables
    this.addSql(`DROP POLICY IF EXISTS "competition_formats_insert" ON "competition_formats";`);
    this.addSql(`DROP POLICY IF EXISTS "competition_formats_update" ON "competition_formats";`);
    this.addSql(`CREATE POLICY "competition_formats_insert" ON "competition_formats" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "competition_formats_update" ON "competition_formats" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "seasons_insert" ON "seasons";`);
    this.addSql(`DROP POLICY IF EXISTS "seasons_update" ON "seasons";`);
    this.addSql(`CREATE POLICY "seasons_insert" ON "seasons" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "seasons_update" ON "seasons" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "site_settings_update" ON "site_settings";`);
    this.addSql(`CREATE POLICY "site_settings_update" ON "site_settings" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "rulebooks_insert" ON "rulebooks";`);
    this.addSql(`DROP POLICY IF EXISTS "rulebooks_update" ON "rulebooks";`);
    this.addSql(`CREATE POLICY "rulebooks_insert" ON "rulebooks" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "rulebooks_update" ON "rulebooks" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "membership_type_configs_insert" ON "membership_type_configs";`);
    this.addSql(`DROP POLICY IF EXISTS "membership_type_configs_update" ON "membership_type_configs";`);
    this.addSql(`CREATE POLICY "membership_type_configs_insert" ON "membership_type_configs" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "membership_type_configs_update" ON "membership_type_configs" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "moderated_images_insert" ON "moderated_images";`);
    this.addSql(`DROP POLICY IF EXISTS "moderated_images_update" ON "moderated_images";`);
    this.addSql(`CREATE POLICY "moderated_images_insert" ON "moderated_images" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "moderated_images_update" ON "moderated_images" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "moderation_log_insert" ON "moderation_log";`);
    this.addSql(`CREATE POLICY "moderation_log_insert" ON "moderation_log" FOR INSERT WITH CHECK (true);`);

    this.addSql(`DROP POLICY IF EXISTS "media_files_insert" ON "media_files";`);
    this.addSql(`DROP POLICY IF EXISTS "media_files_update" ON "media_files";`);
    this.addSql(`DROP POLICY IF EXISTS "media_files_delete" ON "media_files";`);
    this.addSql(`CREATE POLICY "media_files_insert" ON "media_files" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "media_files_update" ON "media_files" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "media_files_delete" ON "media_files" FOR DELETE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "results_entry_sessions_insert" ON "results_entry_sessions";`);
    this.addSql(`DROP POLICY IF EXISTS "results_entry_sessions_update" ON "results_entry_sessions";`);
    this.addSql(`CREATE POLICY "results_entry_sessions_insert" ON "results_entry_sessions" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "results_entry_sessions_update" ON "results_entry_sessions" FOR UPDATE USING (true);`);

    // Ticket system
    this.addSql(`DROP POLICY IF EXISTS "ticket_departments_insert" ON "ticket_departments";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_departments_update" ON "ticket_departments";`);
    this.addSql(`CREATE POLICY "ticket_departments_insert" ON "ticket_departments" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "ticket_departments_update" ON "ticket_departments" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "ticket_routing_rules_insert" ON "ticket_routing_rules";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_routing_rules_update" ON "ticket_routing_rules";`);
    this.addSql(`CREATE POLICY "ticket_routing_rules_insert" ON "ticket_routing_rules" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "ticket_routing_rules_update" ON "ticket_routing_rules" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "ticket_settings_update" ON "ticket_settings";`);
    this.addSql(`CREATE POLICY "ticket_settings_update" ON "ticket_settings" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "ticket_staff_insert" ON "ticket_staff";`);
    this.addSql(`DROP POLICY IF EXISTS "ticket_staff_update" ON "ticket_staff";`);
    this.addSql(`CREATE POLICY "ticket_staff_insert" ON "ticket_staff" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "ticket_staff_update" ON "ticket_staff" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "ticket_staff_departments_insert" ON "ticket_staff_departments";`);
    this.addSql(`CREATE POLICY "ticket_staff_departments_insert" ON "ticket_staff_departments" FOR INSERT WITH CHECK (true);`);

    this.addSql(`DROP POLICY IF EXISTS "ticket_guest_tokens_insert" ON "ticket_guest_tokens";`);
    this.addSql(`CREATE POLICY "ticket_guest_tokens_insert" ON "ticket_guest_tokens" FOR INSERT WITH CHECK (true);`);

    // Event management
    this.addSql(`DROP POLICY IF EXISTS "Events insert" ON "events";`);
    this.addSql(`DROP POLICY IF EXISTS "Events update" ON "events";`);
    this.addSql(`DROP POLICY IF EXISTS "Events delete" ON "events";`);
    this.addSql(`CREATE POLICY "Events insert" ON "events" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "Events update" ON "events" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "Events delete" ON "events" FOR DELETE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "Competition results insert" ON "competition_results";`);
    this.addSql(`DROP POLICY IF EXISTS "Competition results update" ON "competition_results";`);
    this.addSql(`DROP POLICY IF EXISTS "Competition results delete" ON "competition_results";`);
    this.addSql(`CREATE POLICY "Competition results insert" ON "competition_results" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "Competition results update" ON "competition_results" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "Competition results delete" ON "competition_results" FOR DELETE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "event_judge_assignments_insert" ON "event_judge_assignments";`);
    this.addSql(`DROP POLICY IF EXISTS "event_judge_assignments_update" ON "event_judge_assignments";`);
    this.addSql(`DROP POLICY IF EXISTS "event_judge_assignments_delete" ON "event_judge_assignments";`);
    this.addSql(`CREATE POLICY "event_judge_assignments_insert" ON "event_judge_assignments" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "event_judge_assignments_update" ON "event_judge_assignments" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "event_judge_assignments_delete" ON "event_judge_assignments" FOR DELETE USING (true);`);

    // User-owned tables
    this.addSql(`DROP POLICY IF EXISTS "Memberships insert" ON "memberships";`);
    this.addSql(`DROP POLICY IF EXISTS "Memberships update all" ON "memberships";`);
    this.addSql(`DROP POLICY IF EXISTS "Memberships delete" ON "memberships";`);
    this.addSql(`CREATE POLICY "Memberships insert" ON "memberships" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "Memberships update all" ON "memberships" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "Memberships delete" ON "memberships" FOR DELETE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "Users can insert notifications" ON "notifications";`);
    this.addSql(`DROP POLICY IF EXISTS "Notifications update" ON "notifications";`);
    this.addSql(`DROP POLICY IF EXISTS "Notifications delete" ON "notifications";`);
    this.addSql(`CREATE POLICY "Users can insert notifications" ON "notifications" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "Notifications update" ON "notifications" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "Notifications delete" ON "notifications" FOR DELETE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "Orders insert" ON "orders";`);
    this.addSql(`DROP POLICY IF EXISTS "Orders update" ON "orders";`);
    this.addSql(`CREATE POLICY "Orders insert" ON "orders" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "Orders update" ON "orders" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "ratings_update" ON "ratings";`);
    this.addSql(`CREATE POLICY "ratings_update" ON "ratings" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "Event registrations insert" ON "event_registrations";`);
    this.addSql(`DROP POLICY IF EXISTS "Event registrations update" ON "event_registrations";`);
    this.addSql(`DROP POLICY IF EXISTS "Event registrations delete" ON "event_registrations";`);
    this.addSql(`CREATE POLICY "Event registrations insert" ON "event_registrations" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "Event registrations update" ON "event_registrations" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "Event registrations delete" ON "event_registrations" FOR DELETE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "Teams insert" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "Teams update" ON "teams";`);
    this.addSql(`DROP POLICY IF EXISTS "Teams delete" ON "teams";`);
    this.addSql(`CREATE POLICY "Teams insert" ON "teams" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "Teams update" ON "teams" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "Teams delete" ON "teams" FOR DELETE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "Team members insert" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "Team members update" ON "team_members";`);
    this.addSql(`DROP POLICY IF EXISTS "Team members delete" ON "team_members";`);
    this.addSql(`CREATE POLICY "Team members insert" ON "team_members" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "Team members update" ON "team_members" FOR UPDATE USING (true);`);
    this.addSql(`CREATE POLICY "Team members delete" ON "team_members" FOR DELETE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "event_hosting_requests_insert" ON "event_hosting_requests";`);
    this.addSql(`DROP POLICY IF EXISTS "event_hosting_requests_update" ON "event_hosting_requests";`);
    this.addSql(`CREATE POLICY "event_hosting_requests_insert" ON "event_hosting_requests" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "event_hosting_requests_update" ON "event_hosting_requests" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "event_hosting_request_messages_insert" ON "event_hosting_request_messages";`);
    this.addSql(`CREATE POLICY "event_hosting_request_messages_insert" ON "event_hosting_request_messages" FOR INSERT WITH CHECK (true);`);

    this.addSql(`DROP POLICY IF EXISTS "Users can create tickets" ON "tickets";`);
    this.addSql(`DROP POLICY IF EXISTS "tickets_update" ON "tickets";`);
    this.addSql(`CREATE POLICY "Users can create tickets" ON "tickets" FOR INSERT WITH CHECK (true);`);
    this.addSql(`CREATE POLICY "tickets_update" ON "tickets" FOR UPDATE USING (true);`);

    this.addSql(`DROP POLICY IF EXISTS "ticket_comments_insert" ON "ticket_comments";`);
    this.addSql(`CREATE POLICY "ticket_comments_insert" ON "ticket_comments" FOR INSERT WITH CHECK (true);`);

    this.addSql(`DROP POLICY IF EXISTS "ticket_attachments_insert" ON "ticket_attachments";`);
    this.addSql(`CREATE POLICY "ticket_attachments_insert" ON "ticket_attachments" FOR INSERT WITH CHECK (true);`);
  }
}
