import { Migration } from '@mikro-orm/migrations';

/**
 * Capture the submitter's IP + user-agent on the ticket at creation time, so
 * the admin "User Report" panel can show network context for the person who
 * filed the ticket (guests and members alike). Staff-only data — not exposed
 * in the ticket's toJSON. Additive/idempotent.
 */
export class Migration20260608000000_ticket_submitter_fingerprint extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS submitter_ip text NULL,
        ADD COLUMN IF NOT EXISTS submitter_user_agent text NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE tickets
        DROP COLUMN IF EXISTS submitter_ip,
        DROP COLUMN IF EXISTS submitter_user_agent;
    `);
  }
}
