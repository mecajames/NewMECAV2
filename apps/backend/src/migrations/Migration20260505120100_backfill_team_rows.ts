import { Migration } from '@mikro-orm/migrations';

/**
 * Backfills `teams` and `team_members` rows for every paid, non-expired,
 * team-eligible membership that doesn't yet have a Team. Without this,
 * retailer / manufacturer / team / has-team-addon members appear in the
 * public Teams Directory (because that view derives synthetic teams from
 * memberships), but their MyMECA dashboard "my team" lookup misses them
 * (because that lookup only checks the teams table).
 *
 * After this runs, every eligible member has a real Team row whose
 * captain_id points to their profile and a corresponding owner-role
 * team_members row, so the dashboard finds it on the first pass.
 *
 * Eligibility mirrors `teams.service.ts → createTeamForMembership`:
 *   - retail / manufacturer / team category, OR
 *   - membership_type_config.includes_team = true, OR
 *   - competitor with has_team_addon = true
 *
 * Idempotency: each INSERT is guarded by NOT EXISTS, so re-running this
 * migration on a database where some teams have already been created is
 * a no-op for those rows.
 *
 * Naming: prefers retailer_listings.business_name / manufacturer_listings.business_name
 * when one exists for the same user, falls back to memberships.business_name,
 * then memberships.team_name, then "<first_name>'s Team".
 *
 * Safety: only INSERTs. No deletes, no schema changes.
 */
export class Migration20260505120100_backfill_team_rows extends Migration {
  async up(): Promise<void> {
    // Insert Team rows for eligible memberships that don't yet have one.
    // The "team_type" mirrors the service mapping (retail→shop, mfg→club,
    // everything else→competitive).
    this.addSql(`
      INSERT INTO "public"."teams" (
        id, name, description, captain_id, membership_id, team_type,
        max_members, is_public, requires_approval, is_active,
        created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        TRIM(COALESCE(
          NULLIF(rl.business_name, ''),
          NULLIF(ml.business_name, ''),
          NULLIF(m.business_name, ''),
          NULLIF(m.team_name, ''),
          COALESCE(p.first_name, 'New') || '''s Team'
        )),
        m.team_description,
        m.user_id,
        m.id,
        CASE
          WHEN mtc.category = 'retail' THEN 'shop'
          WHEN mtc.category = 'manufacturer' THEN 'club'
          ELSE 'competitive'
        END,
        50,
        true,
        true,
        true,
        now(),
        now()
      FROM memberships m
      JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
      JOIN profiles p ON p.id = m.user_id
      LEFT JOIN retailer_listings rl ON rl.user_id = m.user_id
      LEFT JOIN manufacturer_listings ml ON ml.user_id = m.user_id
      WHERE m.payment_status = 'paid'
        AND m.cancelled_at IS NULL
        AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
        AND (
          mtc.category IN ('retail', 'manufacturer', 'team')
          OR mtc.includes_team = true
          OR (mtc.category = 'competitor' AND m.has_team_addon = true)
        )
        -- Skip memberships that already have a Team row
        AND NOT EXISTS (
          SELECT 1 FROM teams t WHERE t.membership_id = m.id
        )
        -- Also skip if the user already owns a team that we'd link instead
        -- (we let the application's createTeamForMembership flow handle that
        -- corner case; this backfill targets the clean-slate case).
        AND NOT EXISTS (
          SELECT 1 FROM teams t WHERE t.captain_id = m.user_id AND t.is_active = true
        );
    `);

    // For users who DID already own a team (no membership link), link it
    // to their eligible membership so the lookup finds it.
    this.addSql(`
      UPDATE "public"."teams" t
      SET membership_id = link.membership_id, updated_at = now()
      FROM (
        SELECT DISTINCT ON (m.user_id) m.user_id, m.id AS membership_id
        FROM memberships m
        JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
        WHERE m.payment_status = 'paid'
          AND m.cancelled_at IS NULL
          AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
          AND (
            mtc.category IN ('retail', 'manufacturer', 'team')
            OR mtc.includes_team = true
            OR (mtc.category = 'competitor' AND m.has_team_addon = true)
          )
        ORDER BY m.user_id, m.created_at DESC
      ) link
      WHERE t.captain_id = link.user_id
        AND t.is_active = true
        AND t.membership_id IS NULL;
    `);

    // Insert owner team_member rows for any team that's missing one.
    this.addSql(`
      INSERT INTO "public"."team_members" (
        id, team_id, user_id, membership_id, role, status, joined_at
      )
      SELECT
        gen_random_uuid(),
        t.id,
        t.captain_id,
        t.membership_id,
        'owner',
        'active',
        now()
      FROM teams t
      WHERE t.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = t.id AND tm.user_id = t.captain_id
        );
    `);
  }

  async down(): Promise<void> {
    // Don't auto-rollback this — it's user-visible data. If it ever needs to
    // be reversed, do so manually with care after auditing the affected rows.
  }
}
