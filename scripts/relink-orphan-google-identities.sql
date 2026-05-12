-- Reassign each orphan Google identity to its primary auth.users row,
-- then delete the now-empty orphan auth.users row.
--
-- Run with: psql "$PROD_CONN" -v ON_ERROR_STOP=1 -f scripts/relink-orphan-google-identities.sql
-- The script wraps everything in BEGIN/COMMIT — review the inline verifies before
-- changing COMMIT to ROLLBACK on a dry run.

BEGIN;

-- ============================================================================
-- Pre-flight verification: confirm starting state
-- ============================================================================

\echo '== before =='

SELECT 'orphan_users' AS check, id, email
FROM auth.users
WHERE id IN (
    'c1aa6f01-ae9a-4576-8a9e-e9a1a4fb8686',  -- wangocivic (Wayne Beaird, orphan)
    'd28f6098-273e-4a63-9f9d-8075216775c6'   -- mcla72883 (Sierra Quick, orphan)
);

SELECT 'primary_users' AS check, u.id, u.email, p.meca_id, p.first_name, p.last_name
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.id IN (
    '10544c6c-b7e4-44a9-91b8-a66eb20d0b9c',  -- bad_ass_car (Wayne Beaird, primary)
    '5fdd4f13-4144-4e9c-a5f3-4a27f262677b'   -- sierra.quick319 (Sierra Quick, primary)
);

SELECT 'identities_to_move' AS check, user_id, provider, provider_id, identity_data->>'email' AS email_in_identity
FROM auth.identities
WHERE (provider, provider_id) IN (
    ('google', '110345058778904124812'),
    ('google', '112025530529546981843')
);

-- Hard guard: primary must NOT already have a google identity, otherwise
-- the UPDATE would violate the (provider, provider_id) unique constraint
-- via path other than the rows we are moving. We expect 0.
SELECT 'primary_already_has_google' AS check, COUNT(*) AS n
FROM auth.identities
WHERE provider = 'google'
  AND user_id IN (
      '10544c6c-b7e4-44a9-91b8-a66eb20d0b9c',
      '5fdd4f13-4144-4e9c-a5f3-4a27f262677b'
  );

-- ============================================================================
-- Wayne Beaird: move google -> primary, then drop orphan
-- ============================================================================

UPDATE auth.identities
SET user_id    = '10544c6c-b7e4-44a9-91b8-a66eb20d0b9c',
    updated_at = now()
WHERE provider    = 'google'
  AND provider_id = '110345058778904124812'
  AND user_id     = 'c1aa6f01-ae9a-4576-8a9e-e9a1a4fb8686';

DELETE FROM auth.users
WHERE id    = 'c1aa6f01-ae9a-4576-8a9e-e9a1a4fb8686'
  AND email = 'wangocivic@gmail.com';

-- ============================================================================
-- Sierra Quick: move google -> primary, then drop orphan
-- ============================================================================

UPDATE auth.identities
SET user_id    = '5fdd4f13-4144-4e9c-a5f3-4a27f262677b',
    updated_at = now()
WHERE provider    = 'google'
  AND provider_id = '112025530529546981843'
  AND user_id     = 'd28f6098-273e-4a63-9f9d-8075216775c6';

DELETE FROM auth.users
WHERE id    = 'd28f6098-273e-4a63-9f9d-8075216775c6'
  AND email = 'mcla72883@gmail.com';

-- ============================================================================
-- Post-flight verification
-- ============================================================================

\echo '== after =='

-- Both Google identities should now hang off the primary user_ids.
SELECT 'identities_after' AS check, user_id, provider, provider_id, identity_data->>'email' AS email_in_identity
FROM auth.identities
WHERE (provider, provider_id) IN (
    ('google', '110345058778904124812'),
    ('google', '112025530529546981843')
);

-- Orphan auth.users rows should be gone (expect 0).
SELECT 'orphans_remaining' AS check, COUNT(*) AS n
FROM auth.users
WHERE id IN (
    'c1aa6f01-ae9a-4576-8a9e-e9a1a4fb8686',
    'd28f6098-273e-4a63-9f9d-8075216775c6'
);

-- Both primaries should now have 2 identities each (email + google).
SELECT 'primary_identity_count' AS check, user_id, COUNT(*) AS n
FROM auth.identities
WHERE user_id IN (
    '10544c6c-b7e4-44a9-91b8-a66eb20d0b9c',
    '5fdd4f13-4144-4e9c-a5f3-4a27f262677b'
)
GROUP BY user_id;

-- ============================================================================
-- IMPORTANT: this is COMMIT. For a dry-run, change to ROLLBACK and rerun.
-- ============================================================================

COMMIT;
