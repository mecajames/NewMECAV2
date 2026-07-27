import { Migration } from '@mikro-orm/migrations';

/**
 * Chargeback freeze state (James, 2026-07-27).
 *
 * When a payment dispute/chargeback opens (Stripe charge.dispute.created or
 * PayPal CUSTOMER.DISPUTE.CREATED) the membership is FROZEN: the member's
 * login is disabled and the billing subscription is cancelled immediately,
 * but the membership row stays PAID so a dispute won in our favor can be
 * cleanly unfrozen. A lost/accepted dispute converts the freeze into a
 * terminal cancellation. Distinct from dunning suspension (suspended_at) and
 * ordinary cancellation (cancelled_at).
 */
export class Migration20260727100000_membership_chargeback_freeze extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS frozen_at timestamptz;`);
    this.addSql(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS freeze_reason text;`);
    this.addSql(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS dispute_id text;`);
    this.addSql(`COMMENT ON COLUMN memberships.frozen_at IS 'Chargeback freeze: login disabled + subscription cancelled while the dispute is investigated; membership stays PAID until the dispute resolves.';`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE memberships DROP COLUMN IF EXISTS frozen_at;`);
    this.addSql(`ALTER TABLE memberships DROP COLUMN IF EXISTS freeze_reason;`);
    this.addSql(`ALTER TABLE memberships DROP COLUMN IF EXISTS dispute_id;`);
  }
}
