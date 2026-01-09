import { Migration } from '@mikro-orm/migrations';

export class Migration20260108000000_seed_shop_products extends Migration {
  async up(): Promise<void> {
    // Seed initial shop products from old MECA website
    // Categories: measuring_tools, cds, apparel, accessories, other

    // 1. Official MECA X Sensor Stand - $60.00
    this.addSql(`
      INSERT INTO "shop_products" (
        "id", "name", "description", "short_description", "category", "price",
        "is_active", "is_featured", "display_order", "image_url", "sku",
        "stock_quantity", "track_inventory", "created_at", "updated_at"
      ) VALUES (
        gen_random_uuid(),
        'Official MECA X Sensor Stand',
        'Official MECA X sensor stand for competition measurements. This is the official and exclusive MECA meter stand used in MECA competitions.',
        'Official MECA X sensor stand for SPL measurements',
        'measuring_tools',
        60.00,
        true,
        true,
        1,
        'https://i0.wp.com/mecacaraudio.com/wp-content/uploads/2022/06/IMG_7695-scaled.jpg?resize=300%2C300&ssl=1',
        'MECA-X-STAND',
        -1,
        false,
        NOW(),
        NOW()
      ) ON CONFLICT DO NOTHING;
    `);

    // 2. MECA SPL Sensor Stand - Unassembled - $35.00
    this.addSql(`
      INSERT INTO "shop_products" (
        "id", "name", "description", "short_description", "category", "price",
        "is_active", "is_featured", "display_order", "image_url", "sku",
        "stock_quantity", "track_inventory", "created_at", "updated_at"
      ) VALUES (
        gen_random_uuid(),
        'MECA SPL Sensor Stand - Unassembled',
        'Official and exclusive MECA meter stand (unassembled version). Easy to assemble and perfect for competitors who want to save on shipping costs.',
        'Official MECA SPL meter stand - unassembled',
        'measuring_tools',
        35.00,
        true,
        true,
        2,
        'https://i0.wp.com/mecacaraudio.com/wp-content/uploads/2018/03/IMG_1716.jpg?resize=300%2C300&ssl=1',
        'MECA-SPL-STAND-UA',
        -1,
        false,
        NOW(),
        NOW()
      ) ON CONFLICT DO NOTHING;
    `);

    // 3. MECA SQL CD - Tantric Tuning - $20.00
    this.addSql(`
      INSERT INTO "shop_products" (
        "id", "name", "description", "short_description", "category", "price",
        "is_active", "is_featured", "display_order", "image_url", "sku",
        "stock_quantity", "track_inventory", "created_at", "updated_at"
      ) VALUES (
        gen_random_uuid(),
        'MECA SQL CD - Tantric Tuning',
        'SQL tuning CD featuring Tantric Tuning. Official test source for MECA SQL competitions. High quality audio tracks designed for sound quality testing.',
        'Official MECA SQL test CD by Tantric Tuning',
        'cds',
        20.00,
        true,
        true,
        3,
        'https://i0.wp.com/mecacaraudio.com/wp-content/uploads/2016/03/2016-SQL-CD-Tantric-Tuning-cover-page.jpg?resize=300%2C300&ssl=1',
        'MECA-SQL-CD-TT',
        -1,
        false,
        NOW(),
        NOW()
      ) ON CONFLICT DO NOTHING;
    `);

    // 4. MECA SPL Test CD - $20.00
    this.addSql(`
      INSERT INTO "shop_products" (
        "id", "name", "description", "short_description", "category", "price",
        "is_active", "is_featured", "display_order", "image_url", "sku",
        "stock_quantity", "track_inventory", "created_at", "updated_at"
      ) VALUES (
        gen_random_uuid(),
        'MECA SPL Test CD',
        'Test CD for SPL testing. Official MECA SPL test tracks for competition use. Contains all required test tones for MECA SPL competitions.',
        'Official MECA SPL test CD',
        'cds',
        20.00,
        true,
        false,
        4,
        'https://i0.wp.com/mecacaraudio.com/wp-content/uploads/2016/03/mecacdsmall.jpg?resize=200%2C200&ssl=1',
        'MECA-SPL-CD',
        -1,
        false,
        NOW(),
        NOW()
      ) ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    // Remove the seeded products by SKU
    this.addSql(`DELETE FROM "shop_products" WHERE "sku" IN ('MECA-X-STAND', 'MECA-SPL-STAND-UA', 'MECA-SQL-CD-TT', 'MECA-SPL-CD');`);
  }
}
