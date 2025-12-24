import { Migration } from '@mikro-orm/migrations';

export class Migration20251220000000_create_business_listings_tables extends Migration {

  async up(): Promise<void> {
    // Create retailer_listings table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "retailer_listings" (
        "id" uuid NOT NULL,
        "user_id" uuid NULL,
        "business_name" text NOT NULL,
        "description" text NULL,
        "business_email" text NULL,
        "business_phone" varchar(50) NULL,
        "website" text NULL,
        "store_type" varchar(50) NOT NULL DEFAULT 'both',
        "street_address" text NULL,
        "city" varchar(100) NULL,
        "state" varchar(50) NULL,
        "postal_code" varchar(20) NULL,
        "country" varchar(100) NULL DEFAULT 'USA',
        "profile_image_url" text NULL,
        "gallery_images" jsonb NULL,
        "cover_image_position" jsonb NULL,
        "is_sponsor" boolean NOT NULL DEFAULT false,
        "sponsor_order" integer NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_approved" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "retailer_listings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "retailer_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL
      );
    `);

    // Create manufacturer_listings table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "manufacturer_listings" (
        "id" uuid NOT NULL,
        "user_id" uuid NULL,
        "business_name" text NOT NULL,
        "description" text NULL,
        "business_email" text NULL,
        "business_phone" varchar(50) NULL,
        "website" text NULL,
        "product_categories" jsonb NULL,
        "street_address" text NULL,
        "city" varchar(100) NULL,
        "state" varchar(50) NULL,
        "postal_code" varchar(20) NULL,
        "country" varchar(100) NULL DEFAULT 'USA',
        "profile_image_url" text NULL,
        "gallery_images" jsonb NULL,
        "cover_image_position" jsonb NULL,
        "is_sponsor" boolean NOT NULL DEFAULT false,
        "sponsor_order" integer NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_approved" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "manufacturer_listings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "manufacturer_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL
      );
    `);

    // Create indexes for performance
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_retailer_listings_user_id" ON "retailer_listings"("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_retailer_listings_is_sponsor" ON "retailer_listings"("is_sponsor") WHERE is_sponsor = true;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_retailer_listings_is_active_approved" ON "retailer_listings"("is_active", "is_approved") WHERE is_active = true AND is_approved = true;`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_manufacturer_listings_user_id" ON "manufacturer_listings"("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_manufacturer_listings_is_sponsor" ON "manufacturer_listings"("is_sponsor") WHERE is_sponsor = true;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_manufacturer_listings_is_active_approved" ON "manufacturer_listings"("is_active", "is_approved") WHERE is_active = true AND is_approved = true;`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "retailer_listings";`);
    this.addSql(`DROP TABLE IF EXISTS "manufacturer_listings";`);
  }

}
