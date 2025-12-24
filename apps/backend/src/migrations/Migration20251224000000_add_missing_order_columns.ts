import { Migration } from '@mikro-orm/migrations';

export class Migration20251224000000_add_missing_order_columns extends Migration {
  async up(): Promise<void> {
    // Add missing status column to orders table
    this.addSql(`
      DO $$
      BEGIN
        -- Add status column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
          ALTER TABLE "orders" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'pending';
        END IF;

        -- Add order_number column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number') THEN
          ALTER TABLE "orders" ADD COLUMN "order_number" VARCHAR(50);
          -- Generate order numbers for existing records
          WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
            FROM orders
            WHERE order_number IS NULL
          )
          UPDATE orders o
          SET order_number = 'ORD-2024-' || LPAD(n.rn::TEXT, 5, '0')
          FROM numbered n
          WHERE o.id = n.id;
          -- Make it unique and not null after populating
          ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS "idx_orders_order_number" ON "orders"("order_number");
        END IF;
      END $$;
    `);

    // Create index for status
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders"("status");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "idx_orders_status";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_orders_order_number";`);
    this.addSql(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "status";`);
    this.addSql(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "order_number";`);
  }
}
