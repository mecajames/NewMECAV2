import { Migration } from '@mikro-orm/migrations';

export class Migration20260305000000_add_shop_order_tax_rate extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."shop_orders" ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."shop_orders" DROP COLUMN IF EXISTS "tax_rate";`);
  }
}
