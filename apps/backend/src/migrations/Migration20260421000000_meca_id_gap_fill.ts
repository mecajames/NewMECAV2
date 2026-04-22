import { Migration } from '@mikro-orm/migrations';

/**
 * Rewrite get_next_meca_id() so it fills gaps freed by refund-and-cleanup
 * instead of only incrementing MAX. Before this change, deleting a membership
 * retired its MECA ID forever; after, the smallest unused ID in the
 * new-system range (701501..799999) is handed out first.
 *
 * Same race profile as the original (no advisory lock). The caller is
 * expected to be inside a transaction where the inserted membership row
 * claims the ID atomically via the unique constraint on memberships.meca_id.
 */
export class Migration20260421000000_meca_id_gap_fill extends Migration {
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
            -- New-system range is 701501..799999 (legacy IDs live below 701500).
            SELECT MIN(meca_id), MAX(meca_id)
              INTO min_taken, max_taken
              FROM memberships
             WHERE meca_id >= 701501 AND meca_id < 800000;

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
             WHERE m1.meca_id >= 701501 AND m1.meca_id < 799999
               AND NOT EXISTS (
                 SELECT 1 FROM memberships m2
                  WHERE m2.meca_id = m1.meca_id + 1
               )
             ORDER BY m1.meca_id ASC
             LIMIT 1;

            -- If every id up to max_taken is contiguous, fall through to MAX+1.
            RETURN COALESCE(next_id, max_taken + 1);
          END;
        $$;
    `);
  }

  async down(): Promise<void> {
    // Restore the original increment-only behavior from schema_baseline_20260121.
    this.addSql(`
      CREATE OR REPLACE FUNCTION "public"."get_next_meca_id"() RETURNS integer
        LANGUAGE "plpgsql"
        SET "search_path" TO 'public'
        AS $$
          DECLARE
            next_id INTEGER;
          BEGIN
            SELECT COALESCE(MAX(meca_id), 701500) + 1 INTO next_id
              FROM memberships
             WHERE meca_id >= 701500 AND meca_id < 800000;
            RETURN next_id;
          END;
        $$;
    `);
  }
}
