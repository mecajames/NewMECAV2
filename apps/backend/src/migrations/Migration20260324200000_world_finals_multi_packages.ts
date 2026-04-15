import { Migration } from '@mikro-orm/migrations';

export class Migration20260324200000_world_finals_multi_packages extends Migration {
  override async up(): Promise<void> {
    // Drop old single-package table and recreate for multi-package support
    this.addSql(`DROP TABLE IF EXISTS "public"."world_finals_packages" CASCADE;`);

    // New packages table — multiple per season
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."world_finals_packages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "season_id" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "base_price_early" decimal(10,2) NOT NULL DEFAULT 0,
        "base_price_regular" decimal(10,2) NOT NULL DEFAULT 0,
        "included_classes" integer NOT NULL DEFAULT 3,
        "additional_class_price_early" decimal(10,2) NOT NULL DEFAULT 0,
        "additional_class_price_regular" decimal(10,2) NOT NULL DEFAULT 0,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "world_finals_packages_pkey" PRIMARY KEY ("id")
      );
    `);

    // Join table: which competition classes are eligible for each package
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."world_finals_package_classes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "package_id" uuid NOT NULL REFERENCES "public"."world_finals_packages"("id") ON DELETE CASCADE,
        "class_name" text NOT NULL,
        "format" text,
        "is_premium" boolean NOT NULL DEFAULT false,
        "premium_price" decimal(10,2),
        CONSTRAINT "world_finals_package_classes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "world_finals_package_classes_unique" UNIQUE ("package_id", "class_name")
      );
    `);

    // Season-level registration config (dates, toggles) — one per season
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."world_finals_registration_config" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "season_id" uuid NOT NULL,
        "registration_open_date" timestamptz NOT NULL DEFAULT now(),
        "early_bird_deadline" timestamptz NOT NULL DEFAULT now(),
        "registration_close_date" timestamptz NOT NULL DEFAULT now(),
        "collect_tshirt_size" boolean NOT NULL DEFAULT true,
        "collect_ring_size" boolean NOT NULL DEFAULT true,
        "collect_hotel_info" boolean NOT NULL DEFAULT true,
        "collect_guest_count" boolean NOT NULL DEFAULT true,
        "custom_message" text,
        "is_active" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "world_finals_registration_config_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "world_finals_registration_config_season_unique" UNIQUE ("season_id")
      );
    `);

    // Add package_id to finals_registrations
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "package_id" uuid;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."finals_registrations" DROP COLUMN IF EXISTS "package_id";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."world_finals_package_classes";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."world_finals_registration_config";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."world_finals_packages";`);
  }
}
