import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Master/Secondary Membership System
 *
 * This migration adds support for a master/secondary membership hierarchy where:
 * - A master account controls billing for multiple linked secondary memberships
 * - Each secondary gets their own unique MECA ID
 * - Secondaries can optionally have their own login (separate Profile)
 * - All billing goes to the master's profile
 */
export class Migration20251229000000 extends Migration {
  async up(): Promise<void> {
    // =============================================================================
    // Step 1: Create the membership_account_type enum
    // =============================================================================
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_account_type') THEN
          CREATE TYPE membership_account_type AS ENUM ('independent', 'master', 'secondary');
        END IF;
      END$$;
    `);

    // =============================================================================
    // Step 2: Add master/secondary fields to memberships table
    // =============================================================================

    // account_type: INDEPENDENT (default), MASTER, or SECONDARY
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "account_type" membership_account_type NOT NULL DEFAULT 'independent';
    `);

    // master_membership_id: For SECONDARY memberships, reference to the master
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "master_membership_id" uuid REFERENCES "memberships"("id") ON DELETE SET NULL;
    `);

    // has_own_login: Whether secondary has their own Profile/login
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "has_own_login" boolean NOT NULL DEFAULT false;
    `);

    // master_billing_profile_id: Profile responsible for billing (master's profile)
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "master_billing_profile_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL;
    `);

    // linked_at: When this membership was linked as a secondary
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "linked_at" timestamptz;
    `);

    // Create index for efficient lookups of secondary memberships
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_memberships_master_membership_id"
      ON "memberships"("master_membership_id")
      WHERE "master_membership_id" IS NOT NULL;
    `);

    // Create index for billing profile lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_memberships_master_billing_profile_id"
      ON "memberships"("master_billing_profile_id")
      WHERE "master_billing_profile_id" IS NOT NULL;
    `);

    // =============================================================================
    // Step 3: Add secondary account fields to profiles table
    // =============================================================================

    // is_secondary_account: Whether this profile is a secondary (managed by master)
    this.addSql(`
      ALTER TABLE "profiles"
      ADD COLUMN IF NOT EXISTS "is_secondary_account" boolean NOT NULL DEFAULT false;
    `);

    // master_profile_id: For secondary accounts, the master profile that controls them
    this.addSql(`
      ALTER TABLE "profiles"
      ADD COLUMN IF NOT EXISTS "master_profile_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL;
    `);

    // Create index for secondary profiles lookup
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_profiles_master_profile_id"
      ON "profiles"("master_profile_id")
      WHERE "master_profile_id" IS NOT NULL;
    `);

    // =============================================================================
    // Step 4: Add master invoice fields to invoices table
    // =============================================================================

    // is_master_invoice: Whether this is a consolidated invoice for master + secondaries
    this.addSql(`
      ALTER TABLE "invoices"
      ADD COLUMN IF NOT EXISTS "is_master_invoice" boolean NOT NULL DEFAULT false;
    `);

    // master_membership_id: For secondary invoices, the master membership being billed
    this.addSql(`
      ALTER TABLE "invoices"
      ADD COLUMN IF NOT EXISTS "master_membership_id" uuid REFERENCES "memberships"("id") ON DELETE SET NULL;
    `);

    // Create index for master invoice lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_invoices_master_membership_id"
      ON "invoices"("master_membership_id")
      WHERE "master_membership_id" IS NOT NULL;
    `);

    // =============================================================================
    // Step 5: Add secondary membership field to invoice_items table
    // =============================================================================

    // secondary_membership_id: For consolidated invoices, which secondary this line item is for
    this.addSql(`
      ALTER TABLE "invoice_items"
      ADD COLUMN IF NOT EXISTS "secondary_membership_id" uuid REFERENCES "memberships"("id") ON DELETE SET NULL;
    `);

    // Create index for secondary membership invoice item lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_invoice_items_secondary_membership_id"
      ON "invoice_items"("secondary_membership_id")
      WHERE "secondary_membership_id" IS NOT NULL;
    `);
  }

  async down(): Promise<void> {
    // Remove invoice_items column
    this.addSql(`ALTER TABLE "invoice_items" DROP COLUMN IF EXISTS "secondary_membership_id";`);

    // Remove invoices columns
    this.addSql(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "master_membership_id";`);
    this.addSql(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "is_master_invoice";`);

    // Remove profiles columns
    this.addSql(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "master_profile_id";`);
    this.addSql(`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "is_secondary_account";`);

    // Remove memberships columns
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "linked_at";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "master_billing_profile_id";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "has_own_login";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "master_membership_id";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "account_type";`);

    // Drop the enum type
    this.addSql(`DROP TYPE IF EXISTS membership_account_type;`);
  }
}
