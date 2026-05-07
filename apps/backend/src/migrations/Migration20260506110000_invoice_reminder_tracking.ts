import { Migration } from '@mikro-orm/migrations';

/**
 * Track when an invoice's last payment-reminder email was sent so the
 * daily reminder cron can avoid double-sending. Without this column the
 * cron has no de-duplication signal across runs.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS lets the migration re-run safely
 * if it's already been applied via a hot-fix path.
 */
export class Migration20260506110000_invoice_reminder_tracking extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE invoices DROP COLUMN IF EXISTS last_reminder_sent_at;`);
  }
}
