import { Migration } from '@mikro-orm/migrations';

/**
 * Add closed_at timestamp to tickets so the admin queue can show when a
 * ticket was closed (the existing resolved_at column tracks the resolved
 * transition, not the closed one). Backfills existing closed rows from
 * updated_at as a best-effort approximation — when the close action was
 * the last thing that happened to the ticket this is correct, and even
 * when it isn't, it's a strictly better signal than NULL.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS + a WHERE-clause-gated backfill
 * lets the migration re-run without clobbering hand-fixed rows.
 */
export class Migration20260513090000_ticket_closed_at extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS closed_at timestamptz NULL;
    `);

    // Backfill: every currently-closed ticket gets closed_at = updated_at
    // unless it already has a value. Guarded by status so we don't stamp
    // tickets that aren't actually closed.
    this.addSql(`
      UPDATE tickets
         SET closed_at = updated_at
       WHERE status = 'closed'
         AND closed_at IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE tickets DROP COLUMN IF EXISTS closed_at;`);
  }
}
