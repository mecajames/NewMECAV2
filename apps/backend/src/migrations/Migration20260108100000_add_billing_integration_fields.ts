import { Migration } from '@mikro-orm/migrations';

export class Migration20260108100000_add_billing_integration_fields extends Migration {
  async up(): Promise<void> {
    // Add guest checkout and shop order reference fields to orders table
    this.addSql(`
      DO $$
      BEGIN
        -- Add guest_email to orders
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'guest_email') THEN
          ALTER TABLE "orders" ADD COLUMN "guest_email" VARCHAR(255);
        END IF;

        -- Add guest_name to orders
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'guest_name') THEN
          ALTER TABLE "orders" ADD COLUMN "guest_name" VARCHAR(255);
        END IF;

        -- Add shop_order_reference to orders (JSONB for shopOrderId and shopOrderNumber)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shop_order_reference') THEN
          ALTER TABLE "orders" ADD COLUMN "shop_order_reference" JSONB;
        END IF;
      END $$;
    `);

    // Add guest_email to invoices table
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'guest_email') THEN
          ALTER TABLE "invoices" ADD COLUMN "guest_email" VARCHAR(255);
        END IF;
      END $$;
    `);

    // Add billing_order_id to shop_orders table
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_orders' AND column_name = 'billing_order_id') THEN
          ALTER TABLE "shop_orders" ADD COLUMN "billing_order_id" UUID;

          -- Add foreign key constraint
          ALTER TABLE "shop_orders"
            ADD CONSTRAINT "fk_shop_orders_billing_order"
            FOREIGN KEY ("billing_order_id")
            REFERENCES "orders"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Create indexes for efficient lookups
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_orders_guest_email" ON "orders"("guest_email") WHERE "guest_email" IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_invoices_guest_email" ON "invoices"("guest_email") WHERE "guest_email" IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_shop_orders_billing_order" ON "shop_orders"("billing_order_id") WHERE "billing_order_id" IS NOT NULL;`);
  }

  async down(): Promise<void> {
    // Remove indexes
    this.addSql(`DROP INDEX IF EXISTS "idx_orders_guest_email";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_invoices_guest_email";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_shop_orders_billing_order";`);

    // Remove foreign key constraint
    this.addSql(`ALTER TABLE "shop_orders" DROP CONSTRAINT IF EXISTS "fk_shop_orders_billing_order";`);

    // Remove columns
    this.addSql(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "guest_email";`);
    this.addSql(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "guest_name";`);
    this.addSql(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shop_order_reference";`);
    this.addSql(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "guest_email";`);
    this.addSql(`ALTER TABLE "shop_orders" DROP COLUMN IF EXISTS "billing_order_id";`);
  }
}
