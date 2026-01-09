import { Migration } from '@mikro-orm/migrations';

export class Migration20260108110000_add_shipping_fields extends Migration {
  async up(): Promise<void> {
    // Add weight and dimension fields to shop_products for shipping calculation
    this.addSql(`
      DO $$
      BEGIN
        -- Add weight in ounces
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_products' AND column_name = 'weight_oz') THEN
          ALTER TABLE "shop_products" ADD COLUMN "weight_oz" DECIMAL(8,2);
        END IF;

        -- Add length in inches
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_products' AND column_name = 'length_in') THEN
          ALTER TABLE "shop_products" ADD COLUMN "length_in" DECIMAL(8,2);
        END IF;

        -- Add width in inches
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_products' AND column_name = 'width_in') THEN
          ALTER TABLE "shop_products" ADD COLUMN "width_in" DECIMAL(8,2);
        END IF;

        -- Add height in inches
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_products' AND column_name = 'height_in') THEN
          ALTER TABLE "shop_products" ADD COLUMN "height_in" DECIMAL(8,2);
        END IF;
      END $$;
    `);

    // Add shipping method to shop_orders
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_orders' AND column_name = 'shipping_method') THEN
          ALTER TABLE "shop_orders" ADD COLUMN "shipping_method" VARCHAR(50);
        END IF;
      END $$;
    `);

    // Set default weights for existing products based on category
    this.addSql(`
      UPDATE shop_products
      SET weight_oz = CASE
        WHEN category = 'measuring_tools' THEN 16  -- 1 lb for measuring tools
        WHEN category = 'cds' THEN 4              -- 4 oz for CDs
        WHEN category = 'apparel' THEN 8          -- 8 oz for apparel
        WHEN category = 'accessories' THEN 4      -- 4 oz for accessories
        ELSE 8                                    -- default 8 oz
      END
      WHERE weight_oz IS NULL;
    `);
  }

  async down(): Promise<void> {
    // Remove columns
    this.addSql(`ALTER TABLE "shop_products" DROP COLUMN IF EXISTS "weight_oz";`);
    this.addSql(`ALTER TABLE "shop_products" DROP COLUMN IF EXISTS "length_in";`);
    this.addSql(`ALTER TABLE "shop_products" DROP COLUMN IF EXISTS "width_in";`);
    this.addSql(`ALTER TABLE "shop_products" DROP COLUMN IF EXISTS "height_in";`);
    this.addSql(`ALTER TABLE "shop_orders" DROP COLUMN IF EXISTS "shipping_method";`);
  }
}
