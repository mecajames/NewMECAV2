import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Cache Auth Functions in RLS Policies
 *
 * Fixes Performance Advisor "Auth RLS Initialization Plan" warnings by
 * wrapping auth.uid() and auth.jwt() in (SELECT ...) to cache them.
 *
 * ONLY changes caching - does NOT change policy logic or add/remove policies.
 */
export class Migration20260115200000_cache_auth_functions extends Migration {
  async up(): Promise<void> {
    // =========================================================================
    // ACHIEVEMENT TABLES - Fix auth.uid() caching in _admin_all policies
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "achievement_definitions_admin_all" ON "achievement_definitions";`);
    this.addSql(`
      CREATE POLICY "achievement_definitions_admin_all" ON "achievement_definitions"
        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);

    this.addSql(`DROP POLICY IF EXISTS "achievement_recipients_admin_all" ON "achievement_recipients";`);
    this.addSql(`
      CREATE POLICY "achievement_recipients_admin_all" ON "achievement_recipients"
        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);

    this.addSql(`DROP POLICY IF EXISTS "achievement_templates_admin_all" ON "achievement_templates";`);
    this.addSql(`
      CREATE POLICY "achievement_templates_admin_all" ON "achievement_templates"
        FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));
    `);

    // =========================================================================
    // SHOP_PRODUCTS - Fix auth.jwt() caching
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "shop_products_select_policy" ON "shop_products";`);
    this.addSql(`
      CREATE POLICY "shop_products_select_policy" ON "shop_products"
        FOR SELECT USING (is_active = true OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    this.addSql(`DROP POLICY IF EXISTS "shop_products_insert_policy" ON "shop_products";`);
    this.addSql(`
      CREATE POLICY "shop_products_insert_policy" ON "shop_products"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    this.addSql(`DROP POLICY IF EXISTS "shop_products_update_policy" ON "shop_products";`);
    this.addSql(`
      CREATE POLICY "shop_products_update_policy" ON "shop_products"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    this.addSql(`DROP POLICY IF EXISTS "shop_products_delete_policy" ON "shop_products";`);
    this.addSql(`
      CREATE POLICY "shop_products_delete_policy" ON "shop_products"
        FOR DELETE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // =========================================================================
    // SHOP_ORDERS - Fix auth.uid() and auth.jwt() caching
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "shop_orders_select_policy" ON "shop_orders";`);
    this.addSql(`
      CREATE POLICY "shop_orders_select_policy" ON "shop_orders"
        FOR SELECT USING (user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    this.addSql(`DROP POLICY IF EXISTS "shop_orders_insert_policy" ON "shop_orders";`);
    this.addSql(`
      CREATE POLICY "shop_orders_insert_policy" ON "shop_orders"
        FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) OR user_id IS NULL OR (SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    this.addSql(`DROP POLICY IF EXISTS "shop_orders_update_policy" ON "shop_orders";`);
    this.addSql(`
      CREATE POLICY "shop_orders_update_policy" ON "shop_orders"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // =========================================================================
    // SHOP_ORDER_ITEMS - Fix auth.uid() and auth.jwt() caching
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "shop_order_items_select_policy" ON "shop_order_items";`);
    this.addSql(`
      CREATE POLICY "shop_order_items_select_policy" ON "shop_order_items"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM shop_orders
            WHERE shop_orders.id = shop_order_items.order_id
            AND (shop_orders.user_id = (SELECT auth.uid()) OR (SELECT auth.jwt()) ->> 'role' = 'admin')
          )
        );
    `);

    this.addSql(`DROP POLICY IF EXISTS "shop_order_items_insert_policy" ON "shop_order_items";`);
    this.addSql(`
      CREATE POLICY "shop_order_items_insert_policy" ON "shop_order_items"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM shop_orders
            WHERE shop_orders.id = shop_order_items.order_id
            AND (shop_orders.user_id = (SELECT auth.uid()) OR shop_orders.user_id IS NULL OR (SELECT auth.jwt()) ->> 'role' = 'admin')
          )
        );
    `);

    // =========================================================================
    // TRAINING_RECORDS - Fix auth.jwt() caching
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "training_records_select_policy" ON "training_records";`);
    this.addSql(`
      CREATE POLICY "training_records_select_policy" ON "training_records"
        FOR SELECT USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    this.addSql(`DROP POLICY IF EXISTS "training_records_insert_policy" ON "training_records";`);
    this.addSql(`
      CREATE POLICY "training_records_insert_policy" ON "training_records"
        FOR INSERT WITH CHECK ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    this.addSql(`DROP POLICY IF EXISTS "training_records_update_policy" ON "training_records";`);
    this.addSql(`
      CREATE POLICY "training_records_update_policy" ON "training_records"
        FOR UPDATE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    this.addSql(`DROP POLICY IF EXISTS "training_records_delete_policy" ON "training_records";`);
    this.addSql(`
      CREATE POLICY "training_records_delete_policy" ON "training_records"
        FOR DELETE USING ((SELECT auth.jwt()) ->> 'role' = 'admin');
    `);

    // =========================================================================
    // STORAGE.OBJECTS - Fix auth.uid() caching
    // =========================================================================

    this.addSql(`DROP POLICY IF EXISTS "Allow admins to manage all documents" ON storage.objects;`);
    this.addSql(`
      CREATE POLICY "Allow admins to manage all documents" ON storage.objects
        FOR ALL USING (
          bucket_id = 'documents' AND EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
          )
        )
        WITH CHECK (
          bucket_id = 'documents' AND EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
          )
        );
    `);

    this.addSql(`DROP POLICY IF EXISTS "Allow authenticated users to delete their documents" ON storage.objects;`);
    this.addSql(`
      CREATE POLICY "Allow authenticated users to delete their documents" ON storage.objects
        FOR DELETE USING (bucket_id = 'documents' AND owner = (SELECT auth.uid()));
    `);

    this.addSql(`DROP POLICY IF EXISTS "Allow authenticated users to update their documents" ON storage.objects;`);
    this.addSql(`
      CREATE POLICY "Allow authenticated users to update their documents" ON storage.objects
        FOR UPDATE USING (bucket_id = 'documents' AND owner = (SELECT auth.uid()))
        WITH CHECK (bucket_id = 'documents' AND owner = (SELECT auth.uid()));
    `);

    this.addSql(`DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;`);
    this.addSql(`
      CREATE POLICY "Users can upload their own profile images" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
    `);

    this.addSql(`DROP POLICY IF EXISTS "achievement_images_admin_insert" ON storage.objects;`);
    this.addSql(`
      CREATE POLICY "achievement_images_admin_insert" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'achievement-images' AND EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'
          )
        );
    `);
  }

  async down(): Promise<void> {
    // Restore original policies without caching

    // Achievement tables
    this.addSql(`DROP POLICY IF EXISTS "achievement_definitions_admin_all" ON "achievement_definitions";`);
    this.addSql(`CREATE POLICY "achievement_definitions_admin_all" ON "achievement_definitions" FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`);

    this.addSql(`DROP POLICY IF EXISTS "achievement_recipients_admin_all" ON "achievement_recipients";`);
    this.addSql(`CREATE POLICY "achievement_recipients_admin_all" ON "achievement_recipients" FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`);

    this.addSql(`DROP POLICY IF EXISTS "achievement_templates_admin_all" ON "achievement_templates";`);
    this.addSql(`CREATE POLICY "achievement_templates_admin_all" ON "achievement_templates" FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`);

    // Shop products
    this.addSql(`DROP POLICY IF EXISTS "shop_products_select_policy" ON "shop_products";`);
    this.addSql(`CREATE POLICY "shop_products_select_policy" ON "shop_products" FOR SELECT USING (is_active = true OR auth.jwt() ->> 'role' = 'admin');`);
    this.addSql(`DROP POLICY IF EXISTS "shop_products_insert_policy" ON "shop_products";`);
    this.addSql(`CREATE POLICY "shop_products_insert_policy" ON "shop_products" FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');`);
    this.addSql(`DROP POLICY IF EXISTS "shop_products_update_policy" ON "shop_products";`);
    this.addSql(`CREATE POLICY "shop_products_update_policy" ON "shop_products" FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');`);
    this.addSql(`DROP POLICY IF EXISTS "shop_products_delete_policy" ON "shop_products";`);
    this.addSql(`CREATE POLICY "shop_products_delete_policy" ON "shop_products" FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');`);

    // Shop orders
    this.addSql(`DROP POLICY IF EXISTS "shop_orders_select_policy" ON "shop_orders";`);
    this.addSql(`CREATE POLICY "shop_orders_select_policy" ON "shop_orders" FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');`);
    this.addSql(`DROP POLICY IF EXISTS "shop_orders_insert_policy" ON "shop_orders";`);
    this.addSql(`CREATE POLICY "shop_orders_insert_policy" ON "shop_orders" FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR auth.jwt() ->> 'role' = 'admin');`);
    this.addSql(`DROP POLICY IF EXISTS "shop_orders_update_policy" ON "shop_orders";`);
    this.addSql(`CREATE POLICY "shop_orders_update_policy" ON "shop_orders" FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');`);

    // Shop order items
    this.addSql(`DROP POLICY IF EXISTS "shop_order_items_select_policy" ON "shop_order_items";`);
    this.addSql(`CREATE POLICY "shop_order_items_select_policy" ON "shop_order_items" FOR SELECT USING (EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = shop_order_items.order_id AND (shop_orders.user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin')));`);
    this.addSql(`DROP POLICY IF EXISTS "shop_order_items_insert_policy" ON "shop_order_items";`);
    this.addSql(`CREATE POLICY "shop_order_items_insert_policy" ON "shop_order_items" FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = shop_order_items.order_id AND (shop_orders.user_id = auth.uid() OR shop_orders.user_id IS NULL OR auth.jwt() ->> 'role' = 'admin')));`);

    // Training records
    this.addSql(`DROP POLICY IF EXISTS "training_records_select_policy" ON "training_records";`);
    this.addSql(`CREATE POLICY "training_records_select_policy" ON "training_records" FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');`);
    this.addSql(`DROP POLICY IF EXISTS "training_records_insert_policy" ON "training_records";`);
    this.addSql(`CREATE POLICY "training_records_insert_policy" ON "training_records" FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');`);
    this.addSql(`DROP POLICY IF EXISTS "training_records_update_policy" ON "training_records";`);
    this.addSql(`CREATE POLICY "training_records_update_policy" ON "training_records" FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');`);
    this.addSql(`DROP POLICY IF EXISTS "training_records_delete_policy" ON "training_records";`);
    this.addSql(`CREATE POLICY "training_records_delete_policy" ON "training_records" FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');`);

    // Storage policies
    this.addSql(`DROP POLICY IF EXISTS "Allow admins to manage all documents" ON storage.objects;`);
    this.addSql(`CREATE POLICY "Allow admins to manage all documents" ON storage.objects FOR ALL USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`);

    this.addSql(`DROP POLICY IF EXISTS "Allow authenticated users to delete their documents" ON storage.objects;`);
    this.addSql(`CREATE POLICY "Allow authenticated users to delete their documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND owner = auth.uid());`);

    this.addSql(`DROP POLICY IF EXISTS "Allow authenticated users to update their documents" ON storage.objects;`);
    this.addSql(`CREATE POLICY "Allow authenticated users to update their documents" ON storage.objects FOR UPDATE USING (bucket_id = 'documents' AND owner = auth.uid()) WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());`);

    this.addSql(`DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;`);
    this.addSql(`CREATE POLICY "Users can upload their own profile images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = (auth.uid())::text);`);

    this.addSql(`DROP POLICY IF EXISTS "achievement_images_admin_insert" ON storage.objects;`);
    this.addSql(`CREATE POLICY "achievement_images_admin_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'achievement-images' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));`);
  }
}
