import { Migration } from '@mikro-orm/migrations';

/**
 * Unify the MECA ID generators. There were three independent ones:
 *   1. get_next_meca_id()        — gap-fill over MEMBERSHIPS only
 *   2. generate_meca_id()        — sequence checked against PROFILES only
 *      (public signup, supabase.rpc from the frontend)
 *   3. ProfilesService.generateNextMecaId() — JS MAX+1 over PROFILES
 *      (admin Create User wizard; switched to call get_next_meca_id() in
 *      the same change as this migration)
 * Because each consulted a different table, a wizard-created member got two
 * different numbers (profile 701538 / membership 701522 on prod,
 * 2026-06-12), and two different PEOPLE could eventually be issued the same
 * number across tables.
 *
 * get_next_meca_id() now gap-fills over the UNION of memberships.meca_id
 * and profiles.meca_id within the auto-assign range (701501-789999 — the
 * top of the nominal range is reserved for special/legacy IDs like
 * 799996-800000), and generate_meca_id() simply delegates to it. Same race
 * profile as before (no advisory lock); unique constraints are the final
 * arbiter.
 */
export class Migration20260612000000_unify_meca_id_generators extends Migration {
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

    this.addSql(`
      CREATE OR REPLACE FUNCTION "public"."generate_meca_id"() RETURNS integer
        LANGUAGE "plpgsql"
        SET "search_path" TO 'public'
        AS $$
          BEGIN
            -- Single source of truth: the unified generator above.
            RETURN public.get_next_meca_id();
          END;
        $$;
    `);
  }

  async down(): Promise<void> {
    // Restore the 2026-06-11 memberships-only gap-fill version.
    this.addSql(`
      CREATE OR REPLACE FUNCTION "public"."get_next_meca_id"() RETURNS integer
        LANGUAGE "plpgsql"
        SET "search_path" TO 'public'
        AS $$
          DECLARE
            next_id INTEGER;
            min_taken INTEGER;
            max_taken INTEGER;
          BEGIN
            SELECT MIN(meca_id), MAX(meca_id)
              INTO min_taken, max_taken
              FROM memberships
             WHERE meca_id >= 701501 AND meca_id < 799999;

            IF min_taken IS NULL THEN
              RETURN 701501;
            END IF;

            IF min_taken > 701501 THEN
              RETURN 701501;
            END IF;

            SELECT m1.meca_id + 1
              INTO next_id
              FROM memberships m1
             WHERE m1.meca_id >= 701501 AND m1.meca_id < 799998
               AND NOT EXISTS (
                 SELECT 1 FROM memberships m2
                  WHERE m2.meca_id = m1.meca_id + 1
               )
             ORDER BY m1.meca_id ASC
             LIMIT 1;

            next_id := COALESCE(next_id, max_taken + 1);

            IF next_id > 799998 THEN
              RAISE EXCEPTION 'MECA ID auto-assign range exhausted (701501-799998)';
            END IF;

            RETURN next_id;
          END;
        $$;
    `);

    this.addSql(`
      CREATE OR REPLACE FUNCTION "public"."generate_meca_id"() RETURNS integer
        LANGUAGE "plpgsql"
        SET "search_path" TO ''
        AS $$
          DECLARE
            next_id INTEGER;
          BEGIN
            next_id := nextval('meca_id_seq');
            WHILE EXISTS (SELECT 1 FROM profiles WHERE meca_id = next_id) LOOP
              next_id := nextval('meca_id_seq');
            END LOOP;
            RETURN next_id;
          END;
        $$;
    `);
  }
}
