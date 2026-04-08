import { Migration } from '@mikro-orm/migrations';

export class Migration20260407000000_configurable_sizes_extra_tshirts extends Migration {
  override async up(): Promise<void> {
    // Add configurable size lists and extra t-shirt options to registration config
    this.addSql(`ALTER TABLE "public"."world_finals_registration_config"
      ADD COLUMN IF NOT EXISTS "available_tshirt_sizes" jsonb NOT NULL DEFAULT '["XS","S","M","L","XL","2XL","3XL","4XL","5XL"]',
      ADD COLUMN IF NOT EXISTS "available_ring_sizes" jsonb NOT NULL DEFAULT '["5","5.5","6","6.5","7","7.5","8","8.5","9","9.5","10","10.5","11","11.5","12","12.5","13","14","15"]',
      ADD COLUMN IF NOT EXISTS "collect_extra_tshirts" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "extra_tshirt_price" numeric(10,2) NOT NULL DEFAULT 25.00,
      ADD COLUMN IF NOT EXISTS "max_extra_tshirts" integer NOT NULL DEFAULT 5;`);

    // Add extra t-shirts column to finals_registrations
    this.addSql(`ALTER TABLE "public"."finals_registrations"
      ADD COLUMN IF NOT EXISTS "extra_tshirts" jsonb;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."world_finals_registration_config"
      DROP COLUMN IF EXISTS "available_tshirt_sizes",
      DROP COLUMN IF EXISTS "available_ring_sizes",
      DROP COLUMN IF EXISTS "collect_extra_tshirts",
      DROP COLUMN IF EXISTS "extra_tshirt_price",
      DROP COLUMN IF EXISTS "max_extra_tshirts";`);

    this.addSql(`ALTER TABLE "public"."finals_registrations"
      DROP COLUMN IF EXISTS "extra_tshirts";`);
  }
}
