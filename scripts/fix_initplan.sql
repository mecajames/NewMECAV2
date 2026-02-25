BEGIN;

-- advertisers (4 policies - use jwt())
DROP POLICY IF EXISTS "advertisers_select_policy" ON public.advertisers;
CREATE POLICY "advertisers_select_policy" ON public.advertisers FOR SELECT
  USING (((SELECT auth.jwt()) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS "advertisers_insert_policy" ON public.advertisers;
CREATE POLICY "advertisers_insert_policy" ON public.advertisers FOR INSERT
  WITH CHECK (((SELECT auth.jwt()) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS "advertisers_delete_policy" ON public.advertisers;
CREATE POLICY "advertisers_delete_policy" ON public.advertisers FOR DELETE
  USING (((SELECT auth.jwt()) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS "advertisers_update_policy" ON public.advertisers;
CREATE POLICY "advertisers_update_policy" ON public.advertisers FOR UPDATE
  USING (((SELECT auth.jwt()) ->> 'role'::text) = 'admin'::text);

-- banners (4 policies)
DROP POLICY IF EXISTS "banners_select_policy" ON public.banners;
CREATE POLICY "banners_select_policy" ON public.banners FOR SELECT
  USING (((status = 'active'::banner_status) AND (start_date <= CURRENT_DATE) AND (end_date >= CURRENT_DATE)) OR (((SELECT auth.jwt()) ->> 'role'::text) = 'admin'::text));

DROP POLICY IF EXISTS "banners_insert_policy" ON public.banners;
CREATE POLICY "banners_insert_policy" ON public.banners FOR INSERT
  WITH CHECK (((SELECT auth.jwt()) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS "banners_delete_policy" ON public.banners;
CREATE POLICY "banners_delete_policy" ON public.banners FOR DELETE
  USING (((SELECT auth.jwt()) ->> 'role'::text) = 'admin'::text);

DROP POLICY IF EXISTS "banners_update_policy" ON public.banners;
CREATE POLICY "banners_update_policy" ON public.banners FOR UPDATE
  USING (((SELECT auth.jwt()) ->> 'role'::text) = 'admin'::text);

-- communication_log
DROP POLICY IF EXISTS "Admins can view communication log" ON public.communication_log;
CREATE POLICY "Admins can view communication log" ON public.communication_log FOR SELECT
  USING (check_user_permission((SELECT auth.uid()), 'send_emails'::text) OR check_user_permission((SELECT auth.uid()), 'send_sms'::text));

-- member_gallery_images (2 policies)
DROP POLICY IF EXISTS "Anyone can view public gallery images" ON public.member_gallery_images;
CREATE POLICY "Anyone can view public gallery images" ON public.member_gallery_images FOR SELECT
  USING ((is_public = true) OR (member_id = (SELECT auth.uid())) OR check_user_permission((SELECT auth.uid()), 'view_users'::text));

DROP POLICY IF EXISTS "Users can manage own gallery" ON public.member_gallery_images;
CREATE POLICY "Users can manage own gallery" ON public.member_gallery_images FOR ALL
  USING ((member_id = (SELECT auth.uid())) OR check_user_permission((SELECT auth.uid()), 'manage_media'::text));

-- messages (3 policies)
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT
  USING ((from_user_id = (SELECT auth.uid())) OR (to_user_id = (SELECT auth.uid())) OR check_user_permission((SELECT auth.uid()), 'send_system_messages'::text));

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT
  WITH CHECK ((from_user_id = (SELECT auth.uid())) OR check_user_permission((SELECT auth.uid()), 'send_system_messages'::text));

DROP POLICY IF EXISTS "Users can update own received messages" ON public.messages;
CREATE POLICY "Users can update own received messages" ON public.messages FOR UPDATE
  USING (to_user_id = (SELECT auth.uid()))
  WITH CHECK (to_user_id = (SELECT auth.uid()));

-- orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT
  USING ((member_id = (SELECT auth.uid())) OR check_user_permission((SELECT auth.uid()), 'view_orders'::text));

-- permissions
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
CREATE POLICY "Admins can manage permissions" ON public.permissions FOR ALL
  USING (check_user_permission((SELECT auth.uid()), 'manage_permissions'::text));

-- role_permissions
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions FOR ALL
  USING (check_user_permission((SELECT auth.uid()), 'manage_permissions'::text));

-- subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT
  USING ((member_id = (SELECT auth.uid())) OR check_user_permission((SELECT auth.uid()), 'view_users'::text));

-- tickets (4 policies)
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
CREATE POLICY "Authenticated users can create tickets" ON public.tickets FOR INSERT
  WITH CHECK ((((SELECT auth.uid()) IS NOT NULL) AND (reporter_id = (SELECT auth.uid()))) OR ((is_guest_ticket = true) AND (guest_email IS NOT NULL)));

DROP POLICY IF EXISTS "Only admins can delete tickets" ON public.tickets;
CREATE POLICY "Only admins can delete tickets" ON public.tickets FOR DELETE
  USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = 'admin'::user_role))));

DROP POLICY IF EXISTS "Ticket owners and staff can update tickets" ON public.tickets;
CREATE POLICY "Ticket owners and staff can update tickets" ON public.tickets FOR UPDATE
  USING ((reporter_id = (SELECT auth.uid())) OR (assigned_to_id = (SELECT auth.uid())) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'event_director'::user_role]))))));

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets" ON public.tickets FOR SELECT
  USING ((reporter_id = (SELECT auth.uid())) OR (assigned_to_id = (SELECT auth.uid())) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = (SELECT auth.uid())) AND (profiles.role = ANY (ARRAY['admin'::user_role, 'event_director'::user_role]))))) OR ((is_guest_ticket = true) AND (access_token IS NOT NULL)));

-- user_permission_overrides
DROP POLICY IF EXISTS "Admins can manage permission overrides" ON public.user_permission_overrides;
CREATE POLICY "Admins can manage permission overrides" ON public.user_permission_overrides FOR ALL
  USING (check_user_permission((SELECT auth.uid()), 'manage_permissions'::text));

COMMIT;
