import { Migration } from '@mikro-orm/migrations';

/**
 * Fix the get_next_meca_id() function to ignore legacy MECA IDs below 700500.
 *
 * The MECA ID system was designed to start at 700500, but the original function
 * used MAX(meca_id) without filtering, which caused it to continue from legacy
 * IDs like 202401 instead of the proper sequence starting at 700500.
 *
 * This migration updates the function to only consider MECA IDs >= 700500
 * when calculating the next available ID.
 */
export class Migration20251228100000_fix_meca_id_sequence_function extends Migration {
  async up(): Promise<void> {
    // Update the get_next_meca_id function to ignore legacy IDs below 700500
    this.addSql(`
      CREATE OR REPLACE FUNCTION get_next_meca_id() RETURNS INTEGER AS $$
      DECLARE
        next_id INTEGER;
      BEGIN
        -- Only consider MECA IDs >= 700500 (ignore legacy IDs below this threshold)
        SELECT COALESCE(MAX(meca_id), 700499) + 1 INTO next_id FROM memberships WHERE meca_id >= 700500;
        RETURN next_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  async down(): Promise<void> {
    // Revert to original function (without legacy ID filter)
    this.addSql(`
      CREATE OR REPLACE FUNCTION get_next_meca_id() RETURNS INTEGER AS $$
      DECLARE
        next_id INTEGER;
      BEGIN
        SELECT COALESCE(MAX(meca_id), 700499) + 1 INTO next_id FROM memberships;
        RETURN next_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }
}
