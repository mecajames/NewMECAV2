import { Migration } from '@mikro-orm/migrations';

export class Migration20260324100000_world_finals_preregistration extends Migration {
  override async up(): Promise<void> {
    // Create world_finals_packages table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."world_finals_packages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "season_id" uuid NOT NULL,
        "base_price_early" decimal(10,2) NOT NULL DEFAULT 0,
        "base_price_regular" decimal(10,2) NOT NULL DEFAULT 0,
        "included_classes" integer NOT NULL DEFAULT 3,
        "additional_class_price_early" decimal(10,2) NOT NULL DEFAULT 0,
        "additional_class_price_regular" decimal(10,2) NOT NULL DEFAULT 0,
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
        CONSTRAINT "world_finals_packages_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "world_finals_packages_season_id_unique" UNIQUE ("season_id")
      );
    `);

    // Create world_finals_addon_items table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."world_finals_addon_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "season_id" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "price" decimal(10,2) NOT NULL DEFAULT 0,
        "max_quantity" integer NOT NULL DEFAULT 1,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "world_finals_addon_items_pkey" PRIMARY KEY ("id")
      );
    `);

    // Expand finals_registrations with new columns
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "meca_id" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "email" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "first_name" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "last_name" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "phone" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "classes" jsonb;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "addon_items" jsonb;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "tshirt_size" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "ring_size" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "hotel_needed" boolean;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "hotel_notes" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "guest_count" integer DEFAULT 0;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "pricing_tier" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "base_amount" decimal(10,2);`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "addons_amount" decimal(10,2);`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "total_amount" decimal(10,2);`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending';`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "registration_status" text DEFAULT 'pending';`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "notes" text;`);
  }

  override async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS "public"."world_finals_addon_items";');
    this.addSql('DROP TABLE IF EXISTS "public"."world_finals_packages";');
    // Not dropping ALTER columns to avoid data loss
  }
}
