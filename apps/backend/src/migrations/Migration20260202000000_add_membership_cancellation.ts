import { Migration } from '@mikro-orm/migrations';

export class Migration20260202000000_add_membership_cancellation extends Migration {

  async up(): Promise<void> {
    // Add cancellation-related fields to memberships table
    this.addSql(`
      ALTER TABLE memberships
      ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
      ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50);
    `);

    // Add comment explaining the fields
    this.addSql(`
      COMMENT ON COLUMN memberships.cancel_at_period_end IS 'If true, membership will be deactivated at end_date rather than immediately';
    `);
    this.addSql(`
      COMMENT ON COLUMN memberships.cancelled_at IS 'Timestamp when the membership was cancelled';
    `);
    this.addSql(`
      COMMENT ON COLUMN memberships.cancellation_reason IS 'Reason provided for the cancellation';
    `);
    this.addSql(`
      COMMENT ON COLUMN memberships.cancelled_by IS 'User ID or identifier of who cancelled the membership (admin ID)';
    `);
  }

  async down(): Promise<void> {
    // Remove the cancellation fields
    this.addSql(`
      ALTER TABLE memberships
      DROP COLUMN IF EXISTS cancel_at_period_end,
      DROP COLUMN IF EXISTS cancelled_at,
      DROP COLUMN IF EXISTS cancellation_reason,
      DROP COLUMN IF EXISTS cancelled_by;
    `);
  }
}
