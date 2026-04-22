-- Auto-generated rollback for cleanup-orphaned-team-members.mjs
-- Re-inserts deleted team_members rows. Only useful if the referenced
-- teams rows are restored first, otherwise the FK (if one exists) will fail.
BEGIN;
INSERT INTO team_members (id, team_id, user_id, membership_id, role, status, joined_at, requested_at, request_message) VALUES ('11963c44-c179-41d4-af79-0173d4443ab9', 'c92501b0-3b72-4311-a677-0a53ee0702ef', 'e500c5ee-fecd-4b4e-b912-abc49c0769ce', NULL, 'captain', 'active', '2026-02-07T04:45:37.840Z', NULL, NULL);
COMMIT;
