-- =============================================================================
-- SUPABASE SECURITY & PERFORMANCE FIXES
-- Generated: 2026-02-24
--
-- Run each PART separately in the Supabase SQL Editor (https://db.mecacaraudio.com)
-- so you can verify each step.
--
-- SAFE TO RUN: These are non-destructive. The backend uses service_role which
-- bypasses RLS, so all backend operations continue working.
--
-- PARTS:
--   1. Enable RLS on 7 tables missing it
--   2. Drop ~50 overly permissive USING(true) / WITH CHECK(true) policies
--   3. Drop duplicate/redundant policies (performance)
--   4. Fix function search_path (3 functions)
--   5. Fix auth_rls_initplan (performance — wrap auth.uid() in SELECT)
--   6. Notes on processed_webhook_events (no action needed)
-- =============================================================================


-- *****************************************************************************
-- PART 1: Enable RLS on tables missing it (7 tables)
-- *****************************************************************************

ALTER TABLE public.finals_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finals_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_finals_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v1_migration_mappings ENABLE ROW LEVEL SECURITY;


-- *****************************************************************************
-- PART 2: Drop overly permissive RLS policies
--
-- These policies use USING(true) or WITH CHECK(true) on INSERT/UPDATE/DELETE,
-- allowing ANY role (including anon) to modify data directly via PostgREST.
-- Dropping them locks down direct access. service_role (backend) is unaffected.
-- *****************************************************************************

-- banner_engagements
DROP POLICY IF EXISTS "banner_engagements_insert_policy" ON public.banner_engagements;
DROP POLICY IF EXISTS "banner_engagements_update_policy" ON public.banner_engagements;

-- communication_log
DROP POLICY IF EXISTS "System can insert communication log" ON public.communication_log;

-- competition_formats
DROP POLICY IF EXISTS "competition_formats_insert" ON public.competition_formats;
DROP POLICY IF EXISTS "competition_formats_update" ON public.competition_formats;

-- competition_results
DROP POLICY IF EXISTS "Competition results delete" ON public.competition_results;
DROP POLICY IF EXISTS "Competition results insert" ON public.competition_results;
DROP POLICY IF EXISTS "Competition results update" ON public.competition_results;

-- event_hosting_request_messages
DROP POLICY IF EXISTS "event_hosting_request_messages_insert" ON public.event_hosting_request_messages;

-- event_hosting_requests
DROP POLICY IF EXISTS "event_hosting_requests_insert" ON public.event_hosting_requests;
DROP POLICY IF EXISTS "event_hosting_requests_update" ON public.event_hosting_requests;

-- event_judge_assignments
DROP POLICY IF EXISTS "event_judge_assignments_delete" ON public.event_judge_assignments;
DROP POLICY IF EXISTS "event_judge_assignments_insert" ON public.event_judge_assignments;
DROP POLICY IF EXISTS "event_judge_assignments_update" ON public.event_judge_assignments;

-- event_registrations
DROP POLICY IF EXISTS "Event registrations delete" ON public.event_registrations;
DROP POLICY IF EXISTS "Event registrations insert" ON public.event_registrations;
DROP POLICY IF EXISTS "Event registrations update" ON public.event_registrations;

-- events
DROP POLICY IF EXISTS "Events delete" ON public.events;
DROP POLICY IF EXISTS "Events insert" ON public.events;
DROP POLICY IF EXISTS "Events update" ON public.events;

-- media_files
DROP POLICY IF EXISTS "media_files_delete" ON public.media_files;
DROP POLICY IF EXISTS "media_files_insert" ON public.media_files;
DROP POLICY IF EXISTS "media_files_update" ON public.media_files;

-- membership_type_configs
DROP POLICY IF EXISTS "membership_type_configs_insert" ON public.membership_type_configs;
DROP POLICY IF EXISTS "membership_type_configs_update" ON public.membership_type_configs;

-- memberships
DROP POLICY IF EXISTS "Memberships delete" ON public.memberships;
DROP POLICY IF EXISTS "Memberships insert" ON public.memberships;
DROP POLICY IF EXISTS "Memberships update all" ON public.memberships;

-- moderated_images
DROP POLICY IF EXISTS "moderated_images_insert" ON public.moderated_images;
DROP POLICY IF EXISTS "moderated_images_update" ON public.moderated_images;

-- moderation_log
DROP POLICY IF EXISTS "moderation_log_insert" ON public.moderation_log;

-- notifications
DROP POLICY IF EXISTS "Notifications delete" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- orders
DROP POLICY IF EXISTS "Orders insert" ON public.orders;
DROP POLICY IF EXISTS "Orders update" ON public.orders;

-- ratings
DROP POLICY IF EXISTS "ratings_update" ON public.ratings;

-- results_entry_sessions
DROP POLICY IF EXISTS "results_entry_sessions_insert" ON public.results_entry_sessions;
DROP POLICY IF EXISTS "results_entry_sessions_update" ON public.results_entry_sessions;

-- rulebooks
DROP POLICY IF EXISTS "rulebooks_insert" ON public.rulebooks;
DROP POLICY IF EXISTS "rulebooks_update" ON public.rulebooks;

-- seasons
DROP POLICY IF EXISTS "seasons_insert" ON public.seasons;
DROP POLICY IF EXISTS "seasons_update" ON public.seasons;

-- site_settings
DROP POLICY IF EXISTS "site_settings_update" ON public.site_settings;

-- team_members
DROP POLICY IF EXISTS "Team members delete" ON public.team_members;
DROP POLICY IF EXISTS "Team members insert" ON public.team_members;
DROP POLICY IF EXISTS "Team members update" ON public.team_members;

-- teams
DROP POLICY IF EXISTS "Teams delete" ON public.teams;
DROP POLICY IF EXISTS "Teams insert" ON public.teams;
DROP POLICY IF EXISTS "Teams update" ON public.teams;

-- ticket_attachments
DROP POLICY IF EXISTS "ticket_attachments_insert" ON public.ticket_attachments;

-- ticket_comments
DROP POLICY IF EXISTS "ticket_comments_insert" ON public.ticket_comments;

-- ticket_departments
DROP POLICY IF EXISTS "ticket_departments_insert" ON public.ticket_departments;
DROP POLICY IF EXISTS "ticket_departments_update" ON public.ticket_departments;

-- ticket_guest_tokens
DROP POLICY IF EXISTS "ticket_guest_tokens_insert" ON public.ticket_guest_tokens;

-- ticket_routing_rules
DROP POLICY IF EXISTS "ticket_routing_rules_insert" ON public.ticket_routing_rules;
DROP POLICY IF EXISTS "ticket_routing_rules_update" ON public.ticket_routing_rules;

-- ticket_settings
DROP POLICY IF EXISTS "ticket_settings_update" ON public.ticket_settings;

-- ticket_staff
DROP POLICY IF EXISTS "ticket_staff_insert" ON public.ticket_staff;
DROP POLICY IF EXISTS "ticket_staff_update" ON public.ticket_staff;

-- ticket_staff_departments
DROP POLICY IF EXISTS "ticket_staff_departments_insert" ON public.ticket_staff_departments;

-- tickets
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;


-- *****************************************************************************
-- PART 3: Drop duplicate/redundant policies (multiple_permissive_policies)
--
-- When multiple permissive policies exist for the same role+action, Postgres
-- evaluates ALL of them for every query. Keep the most specific one, drop the
-- rest. Many duplicates are already removed by Part 2 above.
--
-- After Part 2, the remaining duplicates are listed below.
-- *****************************************************************************

-- events: duplicate SELECT policies
-- Keep "Anyone can view events", drop the older one
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

-- events: duplicate UPDATE policies for authenticated
-- Keep "Event directors can update their events", drop the older duplicate
DROP POLICY IF EXISTS "Event directors can update own events" ON public.events;

-- seasons: massive duplication — clean up to one policy per action
-- Keep "Anyone can view seasons" for SELECT, drop the rest
DROP POLICY IF EXISTS "Seasons are viewable by everyone" ON public.seasons;
DROP POLICY IF EXISTS "Allow public read access to seasons" ON public.seasons;
-- The "Allow admins to manage seasons" is an ALL policy that overlaps with
-- specific admin policies. Drop it and keep the specific ones.
DROP POLICY IF EXISTS "Allow admins to manage seasons" ON public.seasons;

-- profiles: 3 duplicate SELECT policies
-- Keep "Anyone can view profiles", drop the rest
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- orders: duplicate SELECT policies (after Part 2 removes "Orders insert"/"Orders update")
-- Keep "Users can view own orders" + "Admin can view all orders", drop the overlap
-- "Admins can manage orders" is an ALL policy that overlaps — drop it
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;

-- membership_types: duplicate SELECT
-- Keep "Anyone can view membership types", drop the overlap from the admin ALL policy
DROP POLICY IF EXISTS "Admins can manage membership types" ON public.membership_types;

-- subscriptions: duplicate SELECT
-- Keep "Users can view own subscriptions", drop the admin ALL policy overlap
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

-- ticket_departments: duplicate SELECT for authenticated
-- Keep "Ticket departments viewable", drop the duplicate
DROP POLICY IF EXISTS "ticket_departments_select_policy" ON public.ticket_departments;

-- tickets: duplicate SELECT (after Part 2 removes "Users can create tickets"/"tickets_update")
-- Keep "Users can view their own tickets", drop the broader one
DROP POLICY IF EXISTS "Tickets viewable" ON public.tickets;


-- *****************************************************************************
-- PART 4: Fix function search_path (3 functions)
--
-- Setting search_path = '' prevents search_path injection attacks.
--
-- IMPORTANT: You need to verify the function bodies before running these.
-- Run this query first to see the current function bodies:
--
--   SELECT proname, prosrc, proargtypes, prorettype
--   FROM pg_proc
--   WHERE proname IN ('update_event_status', 'update_updated_at_column', 'check_user_permission')
--     AND pronamespace = 'public'::regnamespace;
--
-- Then replace the function bodies below with the actual ones.
-- *****************************************************************************

-- update_updated_at_column (this one is standard, safe to run as-is)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_event_status — VERIFY BODY FIRST (see query above)
-- Uncomment and fill in the actual body after verifying:
--
-- CREATE OR REPLACE FUNCTION public.update_event_status()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SET search_path = ''
-- AS $$
-- BEGIN
--   -- PASTE ACTUAL BODY HERE
--   RETURN NEW;
-- END;
-- $$;

-- check_user_permission — VERIFY BODY AND ARGS FIRST (see query above)
-- This function likely takes parameters. Get the full signature before recreating.
--
-- CREATE OR REPLACE FUNCTION public.check_user_permission(user_id uuid, permission_name text)
-- RETURNS boolean
-- LANGUAGE plpgsql
-- SET search_path = ''
-- AS $$
-- BEGIN
--   -- PASTE ACTUAL BODY HERE
-- END;
-- $$;


-- *****************************************************************************
-- PART 5: Fix auth_rls_initplan (PERFORMANCE)
--
-- Policies using auth.uid() or auth.role() directly get re-evaluated for EVERY
-- ROW. Wrapping in (SELECT auth.uid()) makes it evaluate ONCE per query.
--
-- Since I don't have the actual policy definitions, here's a query that
-- GENERATES the fix statements automatically. Run this in the SQL Editor,
-- then run the output.
-- *****************************************************************************

-- STEP 1: Run this query to see all affected policies and their definitions:

-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'membership_types', 'orders', 'user_permission_overrides', 'permissions',
--     'role_permissions', 'subscriptions', 'communication_log', 'seasons',
--     'member_gallery_images', 'tickets', 'advertisers', 'banners', 'messages'
--   )
--   AND (
--     qual LIKE '%auth.uid()%' OR qual LIKE '%auth.role()%'
--     OR with_check LIKE '%auth.uid()%' OR with_check LIKE '%auth.role()%'
--     OR qual LIKE '%current_setting(%' OR with_check LIKE '%current_setting(%'
--   )
-- ORDER BY tablename, policyname;

-- STEP 2: For each policy, drop and recreate with (SELECT auth.uid()) wrapper.
-- Example pattern:
--
--   DROP POLICY IF EXISTS "policy_name" ON public.table_name;
--   CREATE POLICY "policy_name" ON public.table_name
--     FOR SELECT
--     USING ( (SELECT auth.uid()) = user_id );
--
-- STEP 3: Here's a query that auto-generates the DROP + CREATE statements.
-- Run this, then execute its output:

-- SELECT
--   'DROP POLICY IF EXISTS ' || quote_literal(policyname) || ' ON public.' || quote_ident(tablename) || ';' || E'\n' ||
--   'CREATE POLICY ' || quote_literal(policyname) || ' ON public.' || quote_ident(tablename) ||
--   CASE WHEN permissive = 'PERMISSIVE' THEN '' ELSE ' AS RESTRICTIVE' END ||
--   ' FOR ' || cmd ||
--   CASE WHEN roles != '{}'::text[] THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END ||
--   CASE
--     WHEN qual IS NOT NULL THEN
--       E'\n  USING (' ||
--       replace(replace(replace(qual,
--         'auth.uid()', '(select auth.uid())'),
--         'auth.role()', '(select auth.role())'),
--         'current_setting(', '(select current_setting(') ||
--       ')'
--     ELSE ''
--   END ||
--   CASE
--     WHEN with_check IS NOT NULL THEN
--       E'\n  WITH CHECK (' ||
--       replace(replace(replace(with_check,
--         'auth.uid()', '(select auth.uid())'),
--         'auth.role()', '(select auth.role())'),
--         'current_setting(', '(select current_setting(') ||
--       ')'
--     ELSE ''
--   END ||
--   ';' as fix_statement
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (
--     qual LIKE '%auth.uid()%' OR qual LIKE '%auth.role()%'
--     OR with_check LIKE '%auth.uid()%' OR with_check LIKE '%auth.role()%'
--     OR qual LIKE '%current_setting(%' OR with_check LIKE '%current_setting(%'
--   )
--   -- Exclude policies we're already dropping in Part 2 and Part 3
--   AND policyname NOT IN (
--     'Admins can manage orders',
--     'Admins can manage membership types',
--     'Admins can manage subscriptions'
--   )
-- ORDER BY tablename, policyname;


-- *****************************************************************************
-- PART 6: Notes
-- *****************************************************************************

-- processed_webhook_events: RLS is enabled but has no policies.
-- This is CORRECT for your architecture. With RLS on and no policies,
-- only service_role (backend) can access it. The linter warning is a
-- false positive for backend-only tables. NO ACTION NEEDED.

-- After running Parts 1-4 (and the generated output from Part 5), re-run
-- the Supabase linter to verify the issues are resolved.
