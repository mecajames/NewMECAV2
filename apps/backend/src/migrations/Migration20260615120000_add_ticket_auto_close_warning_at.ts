import { Migration } from '@mikro-orm/migrations';

/**
 * Inactivity auto-close: track when the 24h "ticket closing soon" warning email
 * was sent. While set, the ticket is in its grace window before
 * TicketAutoCloseService closes it; it's cleared whenever a non-internal reply
 * arrives (the inactivity clock restarts). Driven by the ticket setting
 * `auto_close_inactive_days` (replaces the never-implemented
 * `auto_close_resolved_days`).
 */
export class Migration20260615120000_add_ticket_auto_close_warning_at extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."tickets"
        ADD COLUMN IF NOT EXISTS "auto_close_warning_at" timestamptz NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."tickets" DROP COLUMN IF EXISTS "auto_close_warning_at";`);
  }
}
