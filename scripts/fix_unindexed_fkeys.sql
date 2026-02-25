-- =============================================================================
-- ADD MISSING INDEXES ON FOREIGN KEY COLUMNS
-- Generated: 2026-02-24
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block,
-- so each statement runs independently. CONCURRENTLY means no table locks.
-- =============================================================================

-- achievement_recipients
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievement_recipients_event_id ON public.achievement_recipients (event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievement_recipients_season_id ON public.achievement_recipients (season_id);

-- communication_log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communication_log_sent_by ON public.communication_log (sent_by);

-- contact_submissions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contact_submissions_replied_by ON public.contact_submissions (replied_by);

-- event_director_application_references
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ed_app_refs_checked_by ON public.event_director_application_references (checked_by);

-- event_director_applications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ed_applications_entered_by ON public.event_director_applications (entered_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ed_applications_reviewed_by ON public.event_director_applications (reviewed_by);

-- event_director_assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ed_assignments_requested_by ON public.event_director_assignments (requested_by);

-- event_director_season_qualifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ed_season_quals_qualified_by ON public.event_director_season_qualifications (qualified_by);

-- event_directors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_directors_application_id ON public.event_directors (application_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_directors_approved_by ON public.event_directors (approved_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_directors_created_by ON public.event_directors (created_by);

-- event_judge_assignments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_judge_assignments_requested_by ON public.event_judge_assignments (requested_by);

-- finals_registrations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finals_registrations_season_id ON public.finals_registrations (season_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finals_registrations_user_id ON public.finals_registrations (user_id);

-- finals_votes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finals_votes_voter_id ON public.finals_votes (voter_id);

-- judge_application_references
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judge_app_refs_checked_by ON public.judge_application_references (checked_by);

-- judge_applications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judge_applications_entered_by ON public.judge_applications (entered_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judge_applications_reviewed_by ON public.judge_applications (reviewed_by);

-- judge_level_history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judge_level_history_changed_by ON public.judge_level_history (changed_by);

-- judge_season_qualifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judge_season_quals_qualified_by ON public.judge_season_qualifications (qualified_by);

-- judges
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judges_application_id ON public.judges (application_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judges_approved_by ON public.judges (approved_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judges_created_by ON public.judges (created_by);

-- messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_parent_message_id ON public.messages (parent_message_id);

-- points_configuration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_points_configuration_updated_by ON public.points_configuration (updated_by);

-- profiles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_ed_permission_granted_by ON public.profiles (ed_permission_granted_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_judge_permission_granted_by ON public.profiles (judge_permission_granted_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_master_profile_id ON public.profiles (master_profile_id);

-- result_file_uploads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_result_file_uploads_event_id ON public.result_file_uploads (event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_result_file_uploads_uploaded_by_id ON public.result_file_uploads (uploaded_by_id);

-- result_teams
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_result_teams_member_id ON public.result_teams (member_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_result_teams_team_id ON public.result_teams (team_id);

-- role_permissions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions (permission_id);

-- state_finals_dates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_state_finals_dates_event_id ON public.state_finals_dates (event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_state_finals_dates_season_id ON public.state_finals_dates (season_id);

-- user_permission_overrides
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permission_overrides_permission_id ON public.user_permission_overrides (permission_id);
