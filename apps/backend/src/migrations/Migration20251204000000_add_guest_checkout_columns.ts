import { Migration } from '@mikro-orm/migrations';

export class Migration20251204000000_add_guest_checkout_columns extends Migration {
  async up(): Promise<void> {
    // Make user_id nullable for guest purchases
    this.addSql(`
      ALTER TABLE "memberships"
      ALTER COLUMN "user_id" DROP NOT NULL;
    `);

    // Drop and recreate the foreign key to allow null values
    this.addSql(`
      ALTER TABLE "memberships"
      DROP CONSTRAINT IF EXISTS "memberships_user_id_foreign";
    `);
    this.addSql(`
      ALTER TABLE "memberships"
      ADD CONSTRAINT "memberships_user_id_foreign"
      FOREIGN KEY ("user_id") REFERENCES "profiles" ("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    // Add email for guest purchases
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "email" text;
    `);

    // Add reference to membership type configuration
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "membership_type_config_id" uuid;
    `);
    this.addSql(`
      ALTER TABLE "memberships"
      ADD CONSTRAINT "memberships_membership_type_config_id_foreign"
      FOREIGN KEY ("membership_type_config_id") REFERENCES "membership_type_configs" ("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
    `);

    // Add Stripe payment intent ID
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text;
    `);

    // Add billing info columns for guest purchases
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "billing_first_name" text,
      ADD COLUMN IF NOT EXISTS "billing_last_name" text,
      ADD COLUMN IF NOT EXISTS "billing_phone" text,
      ADD COLUMN IF NOT EXISTS "billing_address" text,
      ADD COLUMN IF NOT EXISTS "billing_city" text,
      ADD COLUMN IF NOT EXISTS "billing_state" text,
      ADD COLUMN IF NOT EXISTS "billing_postal_code" text,
      ADD COLUMN IF NOT EXISTS "billing_country" text;
    `);

    // Add team/business info columns
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "team_name" text,
      ADD COLUMN IF NOT EXISTS "team_description" text,
      ADD COLUMN IF NOT EXISTS "business_name" text,
      ADD COLUMN IF NOT EXISTS "business_website" text;
    `);

    // Update membership_type enum to match new types
    // First, we need to handle the constraint properly
    this.addSql(`
      ALTER TABLE "memberships"
      DROP CONSTRAINT IF EXISTS "memberships_membership_type_check";
    `);

    // Create new enum type for membership types
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE membership_type_enum AS ENUM ('domestic', 'international', 'team', 'retailer', 'annual', 'lifetime');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create indexes for common queries
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_memberships_email" ON "memberships"("email");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_memberships_type_config" ON "memberships"("membership_type_config_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_memberships_stripe_pi" ON "memberships"("stripe_payment_intent_id");');
  }

  async down(): Promise<void> {
    // Remove indexes
    this.addSql('DROP INDEX IF EXISTS "idx_memberships_email";');
    this.addSql('DROP INDEX IF EXISTS "idx_memberships_type_config";');
    this.addSql('DROP INDEX IF EXISTS "idx_memberships_stripe_pi";');

    // Remove team/business columns
    this.addSql(`
      ALTER TABLE "memberships"
      DROP COLUMN IF EXISTS "team_name",
      DROP COLUMN IF EXISTS "team_description",
      DROP COLUMN IF EXISTS "business_name",
      DROP COLUMN IF EXISTS "business_website";
    `);

    // Remove billing info columns
    this.addSql(`
      ALTER TABLE "memberships"
      DROP COLUMN IF EXISTS "billing_first_name",
      DROP COLUMN IF EXISTS "billing_last_name",
      DROP COLUMN IF EXISTS "billing_phone",
      DROP COLUMN IF EXISTS "billing_address",
      DROP COLUMN IF EXISTS "billing_city",
      DROP COLUMN IF EXISTS "billing_state",
      DROP COLUMN IF EXISTS "billing_postal_code",
      DROP COLUMN IF EXISTS "billing_country";
    `);

    // Remove stripe payment intent ID
    this.addSql(`
      ALTER TABLE "memberships"
      DROP COLUMN IF EXISTS "stripe_payment_intent_id";
    `);

    // Remove foreign key and membership_type_config_id
    this.addSql(`
      ALTER TABLE "memberships"
      DROP CONSTRAINT IF EXISTS "memberships_membership_type_config_id_foreign";
    `);
    this.addSql(`
      ALTER TABLE "memberships"
      DROP COLUMN IF EXISTS "membership_type_config_id";
    `);

    // Remove email column
    this.addSql(`
      ALTER TABLE "memberships"
      DROP COLUMN IF EXISTS "email";
    `);

    // Restore NOT NULL on user_id (will fail if there are guest memberships)
    this.addSql(`
      ALTER TABLE "memberships"
      ALTER COLUMN "user_id" SET NOT NULL;
    `);

    // Drop the enum type
    this.addSql('DROP TYPE IF EXISTS membership_type_enum;');
  }
}
