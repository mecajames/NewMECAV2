import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the manual-payment-method values that admin/staff will use when
 * recording cash, check, wire, money order, complimentary, and other
 * forms of payment against an invoice. Without these, the existing
 * `payment_method` enum (stripe / paypal / credit_card / manual /
 * wordpress_pmpro) is too coarse to support real-world AR workflows.
 *
 * IF NOT EXISTS keeps this idempotent — re-running on an already-extended
 * enum is a no-op.
 */
export class Migration20260506100000_extend_payment_method_enum extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cash';`);
    this.addSql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'check';`);
    this.addSql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'wire';`);
    this.addSql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'money_order';`);
    this.addSql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'complimentary';`);
    this.addSql(`ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'other';`);
  }

  override async down(): Promise<void> {
    // PostgreSQL does not support removing enum values without recreating
    // the type and rewriting every dependent column. Down is a no-op.
    console.log('Warning: payment_method enum extension is not auto-reversible.');
  }
}
