-- =============================================================================
-- DIAGNOSE: "Member shows active but gets no points on results"
-- =============================================================================
-- Usage: replace 701234 in the meca_id line below with the member's MECA ID,
-- then run the whole file (read-only — nothing is modified).
--
-- Points eligibility requires ALL of these on ONE membership row:
--   * meca_id = the member's ID          (NULL on the active row = NOT eligible)
--   * payment_status IN ('paid','cancelled')
--   * end_date IS NULL OR end_date > now
--   * membership_type_config.category IN ('competitor','retail','manufacturer')
--     ('team' and NULL categories are NOT points-eligible)
--
-- The "Active" badge in the UI only checks payment status + end_date on ANY
-- row — so a member can look active while failing every check above.
-- =============================================================================

WITH params AS (
  SELECT 701234::int AS meca_id   -- <<< EDIT THIS
)

-- 1) Every membership row that has ever carried this MECA ID
SELECT
  'membership' AS what,
  m.id,
  m.meca_id,
  m.payment_status,
  m.end_date,
  mtc.category                                   AS type_category,
  mtc.name                                       AS type_name,
  p.email,
  p.membership_status                            AS profile_status_label,
  CASE
    WHEN m.meca_id IS NULL                                             THEN 'NO: meca_id missing on this row'
    WHEN m.payment_status NOT IN ('paid','cancelled')                  THEN 'NO: payment_status ' || m.payment_status
    WHEN m.end_date IS NOT NULL AND m.end_date <= NOW()                THEN 'NO: expired ' || m.end_date::date
    WHEN mtc.category IS NULL                                          THEN 'NO: membership type has no category'
    WHEN mtc.category NOT IN ('competitor','retail','manufacturer')    THEN 'NO: category ' || mtc.category || ' is not points-eligible'
    ELSE 'YES — points-eligible'
  END AS points_eligible_verdict
FROM memberships m
LEFT JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
LEFT JOIN profiles p ON p.id = m.user_id
WHERE m.meca_id = (SELECT meca_id FROM params)
   OR m.user_id IN (SELECT m2.user_id FROM memberships m2 WHERE m2.meca_id = (SELECT meca_id FROM params))
ORDER BY m.end_date DESC NULLS FIRST;

-- 2) This season's result rows for the ID — including rows silently rewritten
--    to 999999 (expired-at-entry stamping) and rows held or awaiting review
WITH params AS (
  SELECT 701234::int AS meca_id   -- <<< EDIT THIS (same ID)
)
SELECT
  'result' AS what,
  cr.id,
  cr.meca_id,
  cr.original_meca_id,
  cr.competitor_name,
  cr.competition_class,
  cr.format,
  cr.score,
  cr.points_earned,
  cr.placement,
  cr.points_held_for_renewal,
  cr.held_at,
  cr.pending_back_fill,
  cr.needs_class_review,
  cr.points_manual_override,
  e.title AS event_title,
  e.event_date,
  CASE
    WHEN cr.needs_class_review                                 THEN 'ZERO: awaiting admin class review (Pending Results queue)'
    WHEN cr.points_held_for_renewal AND cr.points_manual_override THEN 'MASKED until recalc/redeploy: held + manual override (fixed in code 2026-08-10)'
    WHEN cr.points_held_for_renewal                            THEN 'ZERO: held for renewal (member was not eligible at last recalc)'
    WHEN cr.meca_id = '999999' AND cr.pending_back_fill        THEN 'ZERO: stamped guest at entry (membership carrying the ID was expired), awaiting back-fill'
    WHEN cr.meca_id = '999999'                                 THEN 'ZERO: recorded as guest'
    WHEN cr.meca_id IS NULL                                    THEN 'ZERO: MECA ID was stripped (grace period expired before renewal)'
    WHEN cr.meca_id <> TRIM(cr.meca_id)                        THEN 'SUSPECT: meca_id has stray whitespace'
    ELSE 'normal'
  END AS why_zero
FROM competition_results cr
LEFT JOIN events e ON e.id = cr.event_id
WHERE TRIM(cr.meca_id) = (SELECT meca_id FROM params)::text
   OR TRIM(cr.original_meca_id) = (SELECT meca_id FROM params)::text
ORDER BY e.event_date DESC NULLS LAST;
