import { Migration } from '@mikro-orm/migrations';

/**
 * Track running paid total on invoices to support partial payments. Until
 * now invoices were binary (paid / unpaid) — `amount_paid` lets multiple
 * Payment rows accumulate against a single invoice (e.g. cash deposit
 * today + check next week). The balance owed is `total - amount_paid`.
 *
 * Backfill: paid invoices get amount_paid = total (so historical fully-
 * paid invoices show a zero balance immediately).
 */
export class Migration20260506120000_invoice_amount_paid extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) NOT NULL DEFAULT 0;
    `);
    // One-shot backfill — set amount_paid = total for any invoice already PAID.
    // Idempotent: re-running just re-writes the same value.
    this.addSql(`
      UPDATE invoices SET amount_paid = total WHERE status = 'paid';
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE invoices DROP COLUMN IF EXISTS amount_paid;`);
  }
}
