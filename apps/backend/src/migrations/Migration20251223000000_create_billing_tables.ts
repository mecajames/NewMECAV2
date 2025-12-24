import { Migration } from '@mikro-orm/migrations';

export class Migration20251223000000_create_billing_tables extends Migration {
  async up(): Promise<void> {
    // Add missing columns to existing orders table
    // The orders table already exists with member_id, we need to add billing-specific columns
    this.addSql(`
      DO $$
      BEGIN
        -- Add user_id as alias for member_id (or use existing member_id)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id') THEN
          ALTER TABLE "orders" ADD COLUMN "user_id" UUID REFERENCES "profiles"("id") ON DELETE SET NULL;
          -- Copy existing member_id values to user_id
          UPDATE "orders" SET "user_id" = "member_id";
        END IF;

        -- Add order_type column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type') THEN
          ALTER TABLE "orders" ADD COLUMN "order_type" VARCHAR(30) DEFAULT 'general';
        END IF;

        -- Add subtotal column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'subtotal') THEN
          ALTER TABLE "orders" ADD COLUMN "subtotal" DECIMAL(10, 2) DEFAULT 0.00;
          -- Copy total_amount to subtotal for existing records
          UPDATE "orders" SET "subtotal" = "total_amount" WHERE "subtotal" IS NULL OR "subtotal" = 0;
        END IF;

        -- Add tax column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tax') THEN
          ALTER TABLE "orders" ADD COLUMN "tax" DECIMAL(10, 2) DEFAULT 0.00;
        END IF;

        -- Add discount column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount') THEN
          ALTER TABLE "orders" ADD COLUMN "discount" DECIMAL(10, 2) DEFAULT 0.00;
        END IF;

        -- Add total column (rename from total_amount or add new)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total') THEN
          ALTER TABLE "orders" ADD COLUMN "total" DECIMAL(10, 2) DEFAULT 0.00;
          -- Copy total_amount to total for existing records
          UPDATE "orders" SET "total" = "total_amount" WHERE "total" IS NULL OR "total" = 0;
        END IF;

        -- Add currency column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'currency') THEN
          ALTER TABLE "orders" ADD COLUMN "currency" VARCHAR(3) DEFAULT 'USD';
        END IF;

        -- Add notes column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') THEN
          ALTER TABLE "orders" ADD COLUMN "notes" TEXT;
        END IF;

        -- Add billing_address column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'billing_address') THEN
          ALTER TABLE "orders" ADD COLUMN "billing_address" JSONB;
        END IF;

        -- Add metadata column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'metadata') THEN
          ALTER TABLE "orders" ADD COLUMN "metadata" JSONB;
        END IF;

        -- Add payment_id column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_id') THEN
          ALTER TABLE "orders" ADD COLUMN "payment_id" UUID REFERENCES "payments"("id") ON DELETE SET NULL;
        END IF;

        -- Add invoice_id column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'invoice_id') THEN
          ALTER TABLE "orders" ADD COLUMN "invoice_id" UUID;
        END IF;
      END $$;
    `);

    // Create indexes for orders (only if columns exist)
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_orders_user" ON "orders"("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders"("created_at");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_orders_order_type" ON "orders"("order_type");`);

    // Create order_items table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "description" TEXT NOT NULL,
        "quantity" INT NOT NULL DEFAULT 1,
        "unit_price" DECIMAL(10, 2) NOT NULL,
        "total" DECIMAL(10, 2) NOT NULL,
        "item_type" VARCHAR(30) NOT NULL,
        "reference_id" UUID,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for order_items
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_order_items_order" ON "order_items"("order_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_order_items_reference" ON "order_items"("reference_id");`);

    // Create invoices table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoice_number" VARCHAR(50) UNIQUE NOT NULL,
        "user_id" UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
        "order_id" UUID UNIQUE REFERENCES "orders"("id") ON DELETE SET NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
        "subtotal" DECIMAL(10, 2) NOT NULL,
        "tax" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        "discount" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        "total" DECIMAL(10, 2) NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
        "due_date" DATE,
        "paid_at" TIMESTAMPTZ,
        "sent_at" TIMESTAMPTZ,
        "pdf_url" TEXT,
        "notes" TEXT,
        "billing_address" JSONB,
        "company_info" JSONB,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for invoices
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoices_user" ON "invoices"("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoices_order" ON "invoices"("order_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "invoices"("status");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoices_invoice_number" ON "invoices"("invoice_number");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoices_created_at" ON "invoices"("created_at");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoices_due_date" ON "invoices"("due_date");`);

    // Create invoice_items table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "invoice_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoice_id" UUID NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
        "description" TEXT NOT NULL,
        "quantity" INT NOT NULL DEFAULT 1,
        "unit_price" DECIMAL(10, 2) NOT NULL,
        "total" DECIMAL(10, 2) NOT NULL,
        "item_type" VARCHAR(30) NOT NULL,
        "reference_id" UUID,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for invoice_items
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoice_items_invoice" ON "invoice_items"("invoice_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoice_items_reference" ON "invoice_items"("reference_id");`);

    // Add foreign key from orders.invoice_id to invoices.id
    this.addSql(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "fk_orders_invoice"
      FOREIGN KEY ("invoice_id")
      REFERENCES "invoices"("id")
      ON DELETE SET NULL;
    `);

    // Create sequences for order and invoice numbers
    this.addSql(`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;`);
    this.addSql(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;`);

    // Create function to generate order numbers
    this.addSql(`
      CREATE OR REPLACE FUNCTION generate_order_number()
      RETURNS VARCHAR AS $$
      DECLARE
        seq_val INT;
        year_str VARCHAR;
      BEGIN
        SELECT nextval('order_number_seq') INTO seq_val;
        SELECT TO_CHAR(NOW(), 'YYYY') INTO year_str;
        RETURN 'ORD-' || year_str || '-' || LPAD(seq_val::TEXT, 5, '0');
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create function to generate invoice numbers
    this.addSql(`
      CREATE OR REPLACE FUNCTION generate_invoice_number()
      RETURNS VARCHAR AS $$
      DECLARE
        seq_val INT;
        year_str VARCHAR;
      BEGIN
        SELECT nextval('invoice_number_seq') INTO seq_val;
        SELECT TO_CHAR(NOW(), 'YYYY') INTO year_str;
        RETURN 'INV-' || year_str || '-' || LPAD(seq_val::TEXT, 5, '0');
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  async down(): Promise<void> {
    // Drop functions
    this.addSql(`DROP FUNCTION IF EXISTS generate_invoice_number();`);
    this.addSql(`DROP FUNCTION IF EXISTS generate_order_number();`);

    // Drop sequences
    this.addSql(`DROP SEQUENCE IF EXISTS invoice_number_seq;`);
    this.addSql(`DROP SEQUENCE IF EXISTS order_number_seq;`);

    // Drop foreign key from orders to invoices
    this.addSql(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "fk_orders_invoice";`);

    // Drop tables in reverse order
    this.addSql(`DROP TABLE IF EXISTS "invoice_items";`);
    this.addSql(`DROP TABLE IF EXISTS "invoices";`);
    this.addSql(`DROP TABLE IF EXISTS "order_items";`);
    this.addSql(`DROP TABLE IF EXISTS "orders";`);
  }
}
