import { Migration } from '@mikro-orm/migrations';

export class Migration20260108100000_add_shop_product_dimensions extends Migration {
  async up(): Promise<void> {
    // Add shipping dimension columns to shop_products
    this.addSql(`
      ALTER TABLE "shop_products"
      ADD COLUMN IF NOT EXISTS "weight_oz" decimal(8,2),
      ADD COLUMN IF NOT EXISTS "length_in" decimal(8,2),
      ADD COLUMN IF NOT EXISTS "width_in" decimal(8,2),
      ADD COLUMN IF NOT EXISTS "height_in" decimal(8,2);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "shop_products"
      DROP COLUMN IF EXISTS "weight_oz",
      DROP COLUMN IF EXISTS "length_in",
      DROP COLUMN IF EXISTS "width_in",
      DROP COLUMN IF EXISTS "height_in";
    `);
  }
}
