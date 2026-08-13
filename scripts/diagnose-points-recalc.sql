-- =============================================================================
-- DIAGNOSE: "Recalculate zeroes points for ACTIVE members" (PROD, 2026-08-12)
-- =============================================================================
-- Read-only. Run each statement in order on the PROD database.
--
-- Theory: the points-eligibility lookup (a MikroORM query over memberships)
-- is THROWING on prod because the deployed code expects columns the prod DB
-- doesn't have yet. That error is caught silently and the recalculation
-- continues with an EMPTY eligibility list — so every member gets 0 points
-- and the recalc still reports success.
-- =============================================================================

-- 1) THE PRIME SUSPECT — chargeback-freeze columns on memberships
--    (Migration20260727100000). If any row below says MISSING, that is the
--    bug: run the pending migrations on prod and recalculate.
SELECT expected.col,
       CASE WHEN c.column_name IS NULL THEN '*** MISSING — THIS BREAKS EVERY MEMBERSHIP QUERY ***' ELSE 'ok' END AS verdict
FROM (VALUES ('frozen_at'), ('freeze_reason'), ('dispute_id')) AS expected(col)
LEFT JOIN information_schema.columns c
       ON c.table_schema = 'public' AND c.table_name = 'memberships' AND c.column_name = expected.col;

-- 2) Other recent entity columns the deployed code selects — any MISSING here
--    breaks the queries that touch that table the same silent way.
SELECT 'competition_results' AS tbl, expected.col,
       CASE WHEN c.column_name IS NULL THEN '*** MISSING ***' ELSE 'ok' END AS verdict
FROM (VALUES ('points_manual_override'), ('points_override_reason'), ('points_override_by'), ('points_override_at'),
             ('points_held_for_renewal'), ('held_at'), ('released_at'),
             ('original_meca_id'), ('pending_back_fill'), ('needs_class_review'), ('state_code')) AS expected(col)
LEFT JOIN information_schema.columns c
       ON c.table_schema = 'public' AND c.table_name = 'competition_results' AND c.column_name = expected.col;

-- 3) Which migrations has prod actually applied recently?
SELECT name, executed_at FROM public.mikro_orm_migrations ORDER BY executed_at DESC LIMIT 12;

-- 4) THE ELIGIBILITY QUERY ITSELF (SQL equivalent of the code's cache
--    refresh). If prod is healthy this returns a big count and includes
--    701544. If the app-level version is what's broken, this still works
--    here — the app fails earlier while SELECTing entity columns (see #1).
SELECT COUNT(*) AS eligible_members,
       COUNT(*) FILTER (WHERE m.meca_id = 701544) AS michael_jones_701544_eligible
FROM public.memberships m
JOIN public.membership_type_configs mtc ON mtc.id = m.membership_type_config_id
WHERE m.meca_id IS NOT NULL
  AND m.payment_status IN ('paid', 'cancelled')
  AND mtc.category IN ('competitor', 'retail', 'manufacturer')
  AND (m.end_date IS NULL OR m.end_date > NOW());

-- 5) Michael Jones's membership rows — why he specifically would fail
SELECT m.id, m.meca_id, m.payment_status, m.end_date, mtc.category, mtc.name
FROM public.memberships m
LEFT JOIN public.membership_type_configs mtc ON mtc.id = m.membership_type_config_id
WHERE m.meca_id = 701544
ORDER BY m.created_at DESC;

-- 6) The event + points config for the 2026 season (3X should pay 1st=15)
SELECT e.id, e.title, e.points_multiplier, e.season_id,
       pc.standard_1st_place, pc.standard_2nd_place
FROM public.events e
LEFT JOIN public.points_configurations pc ON pc.season_id = e.season_id
WHERE e.title ILIKE '%RYSNYM%';

-- 7) The result row itself — flags that block points
SELECT cr.id, cr.meca_id, cr.competitor_name, cr.format, cr.competition_class,
       cr.class_id, cr.needs_class_review, cr.points_held_for_renewal,
       cr.pending_back_fill, cr.points_manual_override, cr.placement,
       cr.points_earned, cr.score
FROM public.competition_results cr
JOIN public.events e ON e.id = cr.event_id
WHERE e.title ILIKE '%RYSNYM%' AND TRIM(COALESCE(cr.meca_id, '')) = '701544';
