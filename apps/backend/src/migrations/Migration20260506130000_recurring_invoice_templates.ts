import { Migration } from '@mikro-orm/migrations';

/**
 * Recurring invoice templates — admin defines a template once and the
 * cron generates a fresh invoice on each cycle. Use cases: monthly
 * sponsorship billing, quarterly retainer, annual chapter dues.
 *
 * The cron reads `next_run_date` and `active`, calls invoicesService.create
 * to materialize an invoice (which auto-creates a paired Order), then
 * advances `next_run_date` by `frequency`. `last_run_at` is purely for
 * UI / debugging.
 */
export class Migration20260506130000_recurring_invoice_templates extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
        name varchar(255) NOT NULL,
        line_items jsonb NOT NULL,
        billing_address jsonb NULL,
        tax numeric(10,2) NOT NULL DEFAULT 0,
        discount numeric(10,2) NOT NULL DEFAULT 0,
        coupon_code varchar(50) NULL,
        currency varchar(3) NOT NULL DEFAULT 'USD',
        notes text NULL,
        frequency varchar(20) NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
        next_run_date date NOT NULL,
        last_run_at timestamptz NULL,
        last_invoice_id uuid NULL REFERENCES invoices(id) ON DELETE SET NULL,
        run_count int NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS recurring_templates_next_run_idx
        ON recurring_invoice_templates(next_run_date) WHERE active = true;
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS recurring_templates_user_idx
        ON recurring_invoice_templates(user_id);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS recurring_invoice_templates;`);
  }
}
