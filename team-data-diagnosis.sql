-- ============================================================
-- TEAM DATA CORRUPTION DIAGNOSIS (READ-ONLY — all SELECTs)
-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/qykahrgwtktqycfgxqep/sql
-- Paste the whole file or run query-by-query; share the results.
-- ============================================================

-- A. James's profile id (sanity check)
SELECT id, first_name, last_name, meca_id, membership_status
FROM profiles WHERE meca_id::text = '202401';

-- B. EVERY team_members row for James, with the team and its real captain.
--    This is the "79 teams" list — the bogus rows will be visible here.
SELECT tm.team_id, t.name AS team_name, tm.role, tm.status,
       tm.joined_at, tm.requested_at,
       cap.first_name || ' ' || cap.last_name AS actual_captain,
       t.is_active, t.created_at AS team_created
FROM team_members tm
LEFT JOIN teams t ON t.id = tm.team_id
LEFT JOIN profiles cap ON cap.id = t.captain_id
WHERE tm.user_id = (SELECT id FROM profiles WHERE meca_id::text = '202401')
ORDER BY tm.joined_at NULLS FIRST, t.name;

-- C. When were James's rows created? Clustering on one date/time identifies
--    the migration/script/import that created them.
SELECT tm.joined_at::date AS joined_on, tm.role, tm.status, COUNT(*) AS rows
FROM team_members tm
WHERE tm.user_id = (SELECT id FROM profiles WHERE meca_id::text = '202401')
GROUP BY 1, 2, 3
ORDER BY 1;

-- D. Teams where James is the captain (should be ONLY LowerHz + HigherHz)
SELECT id, name, is_active, is_public, membership_id, created_at
FROM teams
WHERE captain_id = (SELECT id FROM profiles WHERE meca_id::text = '202401')
ORDER BY name;

-- E. "Next To Nothing": the team row and ALL its member rows
SELECT t.id, t.name, t.captain_id,
       cap.first_name || ' ' || cap.last_name AS captain_name,
       t.membership_id, t.is_active, t.is_public, t.created_at
FROM teams t
LEFT JOIN profiles cap ON cap.id = t.captain_id
WHERE t.name ILIKE '%next to nothing%';

SELECT tm.id AS member_row_id, p.first_name, p.last_name, p.meca_id,
       tm.role, tm.status, tm.joined_at
FROM team_members tm
JOIN profiles p ON p.id = tm.user_id
WHERE tm.team_id IN (SELECT id FROM teams WHERE name ILIKE '%next to nothing%')
ORDER BY tm.joined_at;

-- F. Scale check: which users have the most team_members rows?
--    (Finds other victims of whatever created James's rows.)
SELECT p.first_name, p.last_name, p.meca_id::text, COUNT(*) AS member_rows
FROM team_members tm
JOIN profiles p ON p.id = tm.user_id
GROUP BY p.id, p.first_name, p.last_name, p.meca_id
HAVING COUNT(*) > 3
ORDER BY member_rows DESC
LIMIT 25;

-- G. Teams with MORE THAN ONE owner-role member (corrupted ownership)
SELECT t.name, t.id, COUNT(*) AS owner_rows
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.role = 'owner'
GROUP BY t.id, t.name
HAVING COUNT(*) > 1
ORDER BY owner_rows DESC;

-- H. owner-role rows where the member is NOT the team's captain
--    (this is exactly the "James shown as Owner of Next To Nothing" pattern)
SELECT t.name AS team,
       p.first_name || ' ' || p.last_name AS member, p.meca_id::text,
       cap.first_name || ' ' || cap.last_name AS actual_captain,
       tm.status, tm.joined_at
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
JOIN profiles p ON p.id = tm.user_id
LEFT JOIN profiles cap ON cap.id = t.captain_id
WHERE tm.role = 'owner' AND tm.user_id <> t.captain_id
ORDER BY t.name;
