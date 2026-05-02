import { Migration } from '@mikro-orm/migrations';

/**
 * Adds two admin-controls to voting_sessions for the new admin Finals Voting
 * dashboard:
 *
 *   1. `canceled` value on the voting_session_status enum — terminal state
 *      for sessions admins want to retire (separate from the natural
 *      closed/finalized lifecycle, and cleanly delete-able).
 *
 *   2. `suspended` boolean column — temporarily hides a session from the
 *      public homepage card and the active-session voting query, regardless
 *      of dates or status. Reversible — flipping it back to false restores
 *      normal date/status-based visibility.
 *
 * Both are additive; existing session lifecycle and voting flow are
 * unchanged.
 */
export class Migration20260502120000_voting_session_suspend_cancel extends Migration {
  // Postgres requires ALTER TYPE ADD VALUE to run outside a transaction in
  // older versions; MikroORM honors this flag and runs the migration without
  // wrapping it. Safe in PG14+ but explicit for compatibility.
  override isTransactional(): boolean {
    return false;
  }

  async up(): Promise<void> {
    // 1. Extend status enum
    this.addSql(`
      ALTER TYPE "public"."voting_session_status" ADD VALUE IF NOT EXISTS 'canceled';
    `);

    // 2. Suspended flag — defaults to false for existing rows
    this.addSql(`
      ALTER TABLE "public"."voting_sessions"
        ADD COLUMN IF NOT EXISTS "suspended" boolean NOT NULL DEFAULT false;
    `);

    // Most queries care about "non-suspended sessions in a given status"; a
    // partial index on suspended=false keeps the active-session lookup tight
    // even as the session count grows.
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_voting_sessions_active_visible"
        ON "public"."voting_sessions" (status, start_date, end_date)
        WHERE "suspended" = false;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "public"."idx_voting_sessions_active_visible";`);
    this.addSql(`
      ALTER TABLE "public"."voting_sessions"
        DROP COLUMN IF EXISTS "suspended";
    `);
    // Note: Postgres does not support removing a value from an enum.
    // The 'canceled' value remains but no rows will reference it after rollback.
  }
}
