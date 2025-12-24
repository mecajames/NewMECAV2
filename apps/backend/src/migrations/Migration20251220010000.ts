import { Migration } from '@mikro-orm/migrations';

export class Migration20251220010000 extends Migration {

  override async up(): Promise<void> {
    // Create retailer_listings table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "retailer_listings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "business_name" text NOT NULL,
        "description" text,
        "business_email" text,
        "business_phone" varchar(50),
        "website" text,
        "store_type" varchar(50) DEFAULT 'both',
        "street_address" text,
        "city" varchar(100),
        "state" varchar(50),
        "postal_code" varchar(20),
        "country" varchar(100) DEFAULT 'USA',
        "profile_image_url" text,
        "gallery_images" jsonb,
        "cover_image_position" jsonb,
        "is_sponsor" boolean DEFAULT false,
        "sponsor_order" integer,
        "is_active" boolean DEFAULT true,
        "is_approved" boolean DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "retailer_listings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "retailer_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE
      );
    `);

    // Create manufacturer_listings table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "manufacturer_listings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "business_name" text NOT NULL,
        "description" text,
        "business_email" text,
        "business_phone" varchar(50),
        "website" text,
        "product_categories" jsonb,
        "street_address" text,
        "city" varchar(100),
        "state" varchar(50),
        "postal_code" varchar(20),
        "country" varchar(100) DEFAULT 'USA',
        "profile_image_url" text,
        "gallery_images" jsonb,
        "cover_image_position" jsonb,
        "is_sponsor" boolean DEFAULT false,
        "sponsor_order" integer,
        "is_active" boolean DEFAULT true,
        "is_approved" boolean DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "manufacturer_listings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "manufacturer_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE
      );
    `);

    // Create indexes
    this.addSql(`CREATE INDEX IF NOT EXISTS "retailer_listings_user_id_idx" ON "retailer_listings" ("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "retailer_listings_is_sponsor_idx" ON "retailer_listings" ("is_sponsor") WHERE "is_sponsor" = true;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "retailer_listings_is_active_approved_idx" ON "retailer_listings" ("is_active", "is_approved");`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "manufacturer_listings_user_id_idx" ON "manufacturer_listings" ("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "manufacturer_listings_is_sponsor_idx" ON "manufacturer_listings" ("is_sponsor") WHERE "is_sponsor" = true;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "manufacturer_listings_is_active_approved_idx" ON "manufacturer_listings" ("is_active", "is_approved");`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "retailer_listings";`);
    this.addSql(`DROP TABLE IF EXISTS "manufacturer_listings";`);
  }

}
