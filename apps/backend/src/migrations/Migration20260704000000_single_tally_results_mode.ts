import { Migration } from '@mikro-orm/migrations';

/**
 * "One overall tally" multi-day events (James, 2026-07-04).
 *
 * Event directors run 2-3 day shows but often tally results ONCE for the
 * whole event. Until now the only option was per-day Day 1/Day 2/Day 3
 * event rows — directors entered all results on one day and the other
 * day(s) sat empty on the public calendar/results ("looks blank").
 *
 * - Adds 'single_tally' to multi_day_results_mode_enum: creation produces a
 *   SINGLE event row for the whole show.
 * - Adds events.duration_days so that single row still knows it spans
 *   2-3 days (display/reporting).
 *
 * Note: PostgreSQL can't remove an enum value, so down() only drops the
 * column; the extra enum value is harmless if unused.
 */
export class Migration20260704000000_single_tally_results_mode extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TYPE multi_day_results_mode_enum ADD VALUE IF NOT EXISTS 'single_tally';`);
    this.addSql(`ALTER TABLE events ADD COLUMN IF NOT EXISTS duration_days integer;`);
    this.addSql(`COMMENT ON COLUMN events.duration_days IS 'How many days this single event row spans (single-tally multi-day events). NULL = 1 day / per-day rows.';`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE events DROP COLUMN IF EXISTS duration_days;`);
  }
}
