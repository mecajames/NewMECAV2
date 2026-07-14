import { Migration } from '@mikro-orm/migrations';

/**
 * Per-Event-Director email visibility opt-in (James, 2026-07-12).
 *
 * Site policy: no email addresses on public pages. EDs are the one
 * exception — but only by their OWN choice: each ED can flip
 * "show my email on my events" in their ED dashboard. Default OFF.
 * The public events feed only includes the ED's email when this is true.
 */
export class Migration20260712000000_ed_show_email extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE event_directors ADD COLUMN IF NOT EXISTS show_email_publicly boolean NOT NULL DEFAULT false;`);
    this.addSql(`COMMENT ON COLUMN event_directors.show_email_publicly IS 'ED opt-in: show their email on their events on the public calendar. Default false (site policy: no emails on public pages).';`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE event_directors DROP COLUMN IF EXISTS show_email_publicly;`);
  }
}
