import { Migration } from '@mikro-orm/migrations';

/**
 * MECA IDs that appear in competition_results must NEVER be auto-assigned to
 * a new member — results/standings link members by the meca_id string, so
 * reissuing such a number would hand a new member someone else's competition
 * history.
 *
 * Until now the only thing keeping a used number out of the pool was a row
 * in memberships/profiles still holding it. Deleting a membership (admin
 * cleanup) whose number the profile doesn't mirror (secondaries,
 * multi-category members) — or deleting a profile — silently turned the
 * number into a "gap" the generator would refill.
 *
 * This adds a third arm to get_next_meca_id()'s taken-set: any numeric
 * meca_id present in competition_results (trimmed — imported rows can carry
 * stray spaces). Business rule (James, 2026-07-02): an ID with results
 * attached is permanently retired unless the SAME account (profile/email)
 * renews, in which case the single-id rule in assignMecaIdToMembership
 * re-adopts the number still sitting on their profile.
 */
export class Migration20260703000000_meca_id_exclude_result_ids extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE OR REPLACE FUNCTION "public"."get_next_meca_id"() RETURNS integer
        LANGUAGE "plpgsql"
        SET "search_path" TO 'public'
        AS $$
          DECLARE
            next_id INTEGER;
          BEGIN
            WITH taken AS (
              SELECT meca_id AS id
                FROM memberships
               WHERE meca_id >= 701501 AND meca_id <= 789999
              UNION
              -- profiles.meca_id is integer in some environments and text in
              -- others (entity types it text; DB drifted) — cast through text
              -- so the function works in both.
              SELECT (meca_id::text)::int
                FROM profiles
               WHERE meca_id::text ~ '^[0-9]{1,8}$'
                 AND (meca_id::text)::int >= 701501
                 AND (meca_id::text)::int <= 789999
              UNION
              -- Any ID that competition results reference is retired forever
              -- (reissuing it would give a new member someone else's
              -- competition history). Trim: imported rows can carry a stray
              -- leading/trailing space.
              SELECT (trim(meca_id))::int
                FROM competition_results
               WHERE trim(meca_id) ~ '^[0-9]{1,8}$'
                 AND (trim(meca_id))::int >= 701501
                 AND (trim(meca_id))::int <= 789999
            )
            SELECT COALESCE(
              CASE WHEN NOT EXISTS (SELECT 1 FROM taken WHERE id = 701501)
                   THEN 701501 END,
              (SELECT t1.id + 1
                 FROM taken t1
                WHERE t1.id < 789999
                  AND NOT EXISTS (SELECT 1 FROM taken t2 WHERE t2.id = t1.id + 1)
                ORDER BY t1.id ASC
                LIMIT 1)
            ) INTO next_id;

            IF next_id IS NULL OR next_id > 789999 THEN
              RAISE EXCEPTION 'MECA ID auto-assign range exhausted (701501-789999)';
            END IF;

            RETURN next_id;
          END;
        $$;
    `);
  }

  async down(): Promise<void> {
    // Restore the 2026-06-12 two-table union (memberships + profiles).
    this.addSql(`
      CREATE OR REPLACE FUNCTION "public"."get_next_meca_id"() RETURNS integer
        LANGUAGE "plpgsql"
        SET "search_path" TO 'public'
        AS $$
          DECLARE
            next_id INTEGER;
          BEGIN
            WITH taken AS (
              SELECT meca_id AS id
                FROM memberships
               WHERE meca_id >= 701501 AND meca_id <= 789999
              UNION
              SELECT (meca_id::text)::int
                FROM profiles
               WHERE meca_id::text ~ '^[0-9]{1,8}$'
                 AND (meca_id::text)::int >= 701501
                 AND (meca_id::text)::int <= 789999
            )
            SELECT COALESCE(
              CASE WHEN NOT EXISTS (SELECT 1 FROM taken WHERE id = 701501)
                   THEN 701501 END,
              (SELECT t1.id + 1
                 FROM taken t1
                WHERE t1.id < 789999
                  AND NOT EXISTS (SELECT 1 FROM taken t2 WHERE t2.id = t1.id + 1)
                ORDER BY t1.id ASC
                LIMIT 1)
            ) INTO next_id;

            IF next_id IS NULL OR next_id > 789999 THEN
              RAISE EXCEPTION 'MECA ID auto-assign range exhausted (701501-789999)';
            END IF;

            RETURN next_id;
          END;
        $$;
    `);
  }
}
