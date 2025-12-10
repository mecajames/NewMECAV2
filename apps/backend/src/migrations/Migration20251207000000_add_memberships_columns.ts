import { Migration } from '@mikro-orm/migrations';

export class Migration20251207000000_add_memberships_columns extends Migration {
  async up(): Promise<void> {
    // Add missing enum values to membership_type
    this.addSql(`ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'domestic';`);
    this.addSql(`ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'international';`);
    this.addSql(`ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'team';`);
    this.addSql(`ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'retailer';`);

    // Add columns needed by the Membership entity
    this.addSql(`
      ALTER TABLE "public"."memberships"
      ADD COLUMN IF NOT EXISTS "start_date" timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "end_date" timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "transaction_id" text,
      ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now(),
      ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    `);

    // Copy data from old columns to new columns if they exist
    this.addSql(`
      UPDATE "public"."memberships"
      SET start_date = purchase_date
      WHERE start_date IS NULL AND purchase_date IS NOT NULL;
    `);

    this.addSql(`
      UPDATE "public"."memberships"
      SET end_date = expiry_date
      WHERE end_date IS NULL AND expiry_date IS NOT NULL;
    `);

    // Map old status to new payment_status
    this.addSql(`
      UPDATE "public"."memberships"
      SET payment_status = 'paid'
      WHERE status = 'active' AND payment_status = 'pending';
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."memberships"
      DROP COLUMN IF EXISTS "start_date",
      DROP COLUMN IF EXISTS "end_date",
      DROP COLUMN IF EXISTS "payment_status",
      DROP COLUMN IF EXISTS "transaction_id",
      DROP COLUMN IF EXISTS "created_at",
      DROP COLUMN IF EXISTS "updated_at";
    `);
  }
}
