import { Migration } from '@mikro-orm/migrations';

export class Migration20251202000000_create_payments_table extends Migration {

  async up(): Promise<void> {
    // Create payment_status enum type (if not exists)
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create payment_method enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('stripe', 'paypal', 'credit_card', 'manual', 'wordpress_pmpro');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create payment_type enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE payment_type AS ENUM ('membership', 'event_registration', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create payments table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
        "membership_id" uuid REFERENCES "memberships"("id") ON DELETE SET NULL,
        "payment_type" payment_type NOT NULL,
        "payment_method" payment_method NOT NULL,
        "payment_status" payment_status NOT NULL DEFAULT 'pending',
        "amount" decimal(10,2) NOT NULL,
        "currency" varchar(3) DEFAULT 'USD',
        "transaction_id" text,
        "external_payment_id" text,
        "stripe_payment_intent_id" text,
        "stripe_customer_id" text,
        "wordpress_order_id" text,
        "wordpress_subscription_id" text,
        "payment_metadata" jsonb,
        "description" text,
        "paid_at" timestamptz,
        "refunded_at" timestamptz,
        "refund_reason" text,
        "failure_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create indexes on payments table
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_user" ON "payments"("user_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_membership" ON "payments"("membership_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments"("payment_status");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_type" ON "payments"("payment_type");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_method" ON "payments"("payment_method");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_transaction_id" ON "payments"("transaction_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_stripe_intent" ON "payments"("stripe_payment_intent_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_wordpress_order" ON "payments"("wordpress_order_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_payments_created_at" ON "payments"("created_at");');
  }

  async down(): Promise<void> {
    // Drop payments table
    this.addSql('DROP TABLE IF EXISTS "payments" CASCADE;');

    // Drop payment_type enum
    this.addSql('DROP TYPE IF EXISTS payment_type CASCADE;');

    // Drop payment_method enum
    this.addSql('DROP TYPE IF EXISTS payment_method CASCADE;');

    // Drop payment_status enum
    this.addSql('DROP TYPE IF EXISTS payment_status CASCADE;');
  }

}
