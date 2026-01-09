import { Migration } from '@mikro-orm/migrations';

export class Migration20260107000000_create_shop_tables extends Migration {
  async up(): Promise<void> {
    // Create shop_product_category enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE shop_product_category AS ENUM ('measuring_tools', 'cds', 'apparel', 'accessories', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create shop_order_status enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE shop_order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create shop_products table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "shop_products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "description" text,
        "short_description" text,
        "category" shop_product_category NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "compare_at_price" decimal(10,2),
        "is_active" boolean NOT NULL DEFAULT true,
        "is_featured" boolean NOT NULL DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        "image_url" text,
        "additional_images" jsonb,
        "sku" text,
        "stock_quantity" integer NOT NULL DEFAULT -1,
        "track_inventory" boolean NOT NULL DEFAULT false,
        "stripe_product_id" text,
        "stripe_price_id" text,
        "quickbooks_item_id" text,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create shop_orders table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "shop_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_number" text NOT NULL UNIQUE,
        "user_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "guest_email" text,
        "guest_name" text,
        "status" shop_order_status NOT NULL DEFAULT 'pending',
        "subtotal" decimal(10,2) NOT NULL,
        "shipping_amount" decimal(10,2) NOT NULL DEFAULT 0,
        "tax_amount" decimal(10,2) NOT NULL DEFAULT 0,
        "total_amount" decimal(10,2) NOT NULL,
        "stripe_payment_intent_id" text,
        "stripe_charge_id" text,
        "shipping_address" jsonb,
        "billing_address" jsonb,
        "notes" text,
        "admin_notes" text,
        "tracking_number" text,
        "shipped_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create shop_order_items table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "shop_order_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "shop_orders"("id") ON DELETE CASCADE,
        "product_id" uuid REFERENCES "shop_products"("id") ON DELETE SET NULL,
        "product_name" text NOT NULL,
        "product_sku" text,
        "unit_price" decimal(10,2) NOT NULL,
        "quantity" integer NOT NULL,
        "total_price" decimal(10,2) NOT NULL
      );
    `);

    // Create indexes for shop_products
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_products_category" ON "shop_products"("category");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_products_active" ON "shop_products"("is_active");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_products_featured" ON "shop_products"("is_featured");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_products_display_order" ON "shop_products"("display_order");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_products_sku" ON "shop_products"("sku");');

    // Create indexes for shop_orders
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_orders_user" ON "shop_orders"("user_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_orders_status" ON "shop_orders"("status");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_orders_created_at" ON "shop_orders"("created_at");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_orders_payment_intent" ON "shop_orders"("stripe_payment_intent_id");');

    // Create indexes for shop_order_items
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_order_items_order" ON "shop_order_items"("order_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_shop_order_items_product" ON "shop_order_items"("product_id");');

    // Enable RLS on shop tables
    this.addSql('ALTER TABLE "shop_products" ENABLE ROW LEVEL SECURITY;');
    this.addSql('ALTER TABLE "shop_orders" ENABLE ROW LEVEL SECURITY;');
    this.addSql('ALTER TABLE "shop_order_items" ENABLE ROW LEVEL SECURITY;');

    // Create RLS policies for shop_products (public read for active products)
    this.addSql(`
      CREATE POLICY "shop_products_select_policy" ON "shop_products"
        FOR SELECT USING (is_active = true OR auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "shop_products_insert_policy" ON "shop_products"
        FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "shop_products_update_policy" ON "shop_products"
        FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "shop_products_delete_policy" ON "shop_products"
        FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
    `);

    // Create RLS policies for shop_orders (users can see own orders, admins can see all)
    this.addSql(`
      CREATE POLICY "shop_orders_select_policy" ON "shop_orders"
        FOR SELECT USING (
          user_id = auth.uid()
          OR auth.jwt() ->> 'role' = 'admin'
        );
    `);

    this.addSql(`
      CREATE POLICY "shop_orders_insert_policy" ON "shop_orders"
        FOR INSERT WITH CHECK (
          user_id = auth.uid()
          OR user_id IS NULL
          OR auth.jwt() ->> 'role' = 'admin'
        );
    `);

    this.addSql(`
      CREATE POLICY "shop_orders_update_policy" ON "shop_orders"
        FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
    `);

    // Create RLS policies for shop_order_items
    this.addSql(`
      CREATE POLICY "shop_order_items_select_policy" ON "shop_order_items"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM shop_orders
            WHERE shop_orders.id = shop_order_items.order_id
            AND (shop_orders.user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
          )
        );
    `);

    this.addSql(`
      CREATE POLICY "shop_order_items_insert_policy" ON "shop_order_items"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM shop_orders
            WHERE shop_orders.id = shop_order_items.order_id
            AND (shop_orders.user_id = auth.uid() OR shop_orders.user_id IS NULL OR auth.jwt() ->> 'role' = 'admin')
          )
        );
    `);

    // Seed initial products
    this.addSql(`
      INSERT INTO "shop_products" (name, description, short_description, category, price, is_active, is_featured, display_order)
      VALUES
        ('MECA SPL Sensor Stand – Unassembled', 'High-quality SPL sensor stand kit. Assembly required. Perfect for SPL competitions.', 'Unassembled SPL sensor stand kit', 'measuring_tools', 35.00, true, false, 1),
        ('Official MECA X Sensor Stand', 'The official MECA X sensor stand - fully assembled and competition ready. Premium build quality.', 'Fully assembled premium sensor stand', 'measuring_tools', 60.00, true, true, 2),
        ('MECA SPL Test CD', 'Official MECA SPL test CD with calibrated test tones and tracks for competition preparation.', 'SPL test tracks and calibration tones', 'cds', 20.00, true, false, 3),
        ('MECA SQL CD – Tantric Tuning', 'Official MECA SQL CD featuring Tantric Tuning tracks for sound quality competition preparation.', 'SQL competition preparation tracks', 'cds', 20.00, true, false, 4);
    `);
  }

  async down(): Promise<void> {
    // Drop RLS policies
    this.addSql('DROP POLICY IF EXISTS "shop_order_items_insert_policy" ON "shop_order_items";');
    this.addSql('DROP POLICY IF EXISTS "shop_order_items_select_policy" ON "shop_order_items";');
    this.addSql('DROP POLICY IF EXISTS "shop_orders_update_policy" ON "shop_orders";');
    this.addSql('DROP POLICY IF EXISTS "shop_orders_insert_policy" ON "shop_orders";');
    this.addSql('DROP POLICY IF EXISTS "shop_orders_select_policy" ON "shop_orders";');
    this.addSql('DROP POLICY IF EXISTS "shop_products_delete_policy" ON "shop_products";');
    this.addSql('DROP POLICY IF EXISTS "shop_products_update_policy" ON "shop_products";');
    this.addSql('DROP POLICY IF EXISTS "shop_products_insert_policy" ON "shop_products";');
    this.addSql('DROP POLICY IF EXISTS "shop_products_select_policy" ON "shop_products";');

    // Drop tables
    this.addSql('DROP TABLE IF EXISTS "shop_order_items" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "shop_orders" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "shop_products" CASCADE;');

    // Drop enum types
    this.addSql('DROP TYPE IF EXISTS shop_order_status CASCADE;');
    this.addSql('DROP TYPE IF EXISTS shop_product_category CASCADE;');
  }
}
