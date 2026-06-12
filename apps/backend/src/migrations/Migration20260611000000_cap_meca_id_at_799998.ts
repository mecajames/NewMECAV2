import { Migration } from '@mikro-orm/migrations';

/**
 * Cap auto-assigned MECA IDs at 799998. IDs 799999 and above are
 * manually-assigned specials and must never seed the sequence: a row holding
 * 799999 made the MAX+1 fall-through return 800000 — out of range and already
 * taken by an existing profile, so user creation 500'd on the unique
 * constraint. The generator now ignores anything at or above 799999 and
 * raises instead of ever issuing past the cap.
 *
 * Same race profile as before (no advisory lock); the caller's insert claims
 * the ID atomically via the unique constraint on memberships.meca_id.
 */
export class Migration20260611000000_cap_meca_id_at_799998 extends Migration {
  async up(): Promise<void> {
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
            -- Auto-assignable range is 701501..799998 (legacy IDs live below
            -- 701500; 799999+ are manually-assigned specials and are ignored).
            SELECT MIN(meca_id), MAX(meca_id)
              INTO min_taken, max_taken
              FROM memberships
             WHERE meca_id >= 701501 AND meca_id < 799999;

            -- No IDs issued yet -> start at 701501.
            IF min_taken IS NULL THEN
              RETURN 701501;
            END IF;

            -- 701501 itself is free (e.g. after a refund of the only member).
            IF min_taken > 701501 THEN
              RETURN 701501;
            END IF;

            -- Find the smallest taken id whose successor is NOT taken -> that
            -- successor is the smallest gap we can reuse.
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

            -- If every id up to max_taken is contiguous, fall through to MAX+1.
            next_id := COALESCE(next_id, max_taken + 1);

            IF next_id > 799998 THEN
              RAISE EXCEPTION 'MECA ID auto-assign range exhausted (701501-799998)';
            END IF;

            RETURN next_id;
          END;
        $$;
    `);
  }

  async down(): Promise<void> {
    // Restore the 2026-04-21 gap-fill version (range top at 799999/800000).
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
             WHERE meca_id >= 701501 AND meca_id < 800000;

            IF min_taken IS NULL THEN
              RETURN 701501;
            END IF;

            IF min_taken > 701501 THEN
              RETURN 701501;
            END IF;

            SELECT m1.meca_id + 1
              INTO next_id
              FROM memberships m1
             WHERE m1.meca_id >= 701501 AND m1.meca_id < 799999
               AND NOT EXISTS (
                 SELECT 1 FROM memberships m2
                  WHERE m2.meca_id = m1.meca_id + 1
               )
             ORDER BY m1.meca_id ASC
             LIMIT 1;

            RETURN COALESCE(next_id, max_taken + 1);
          END;
        $$;
    `);
  }
}
