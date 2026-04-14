import { Migration } from '@mikro-orm/migrations';

export class Migration20260414000000_create_coupons extends Migration {
  async up(): Promise<void> {
    // ── coupons table ────────────────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."coupons" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        "code" varchar(50) NOT NULL UNIQUE,
        "description" text,
        "discount_type" varchar(20) NOT NULL,
        "discount_value" numeric(10,2) NOT NULL,
        "scope" varchar(20) NOT NULL DEFAULT 'all',
        "applicable_product_ids" jsonb,
        "applicable_membership_type_config_ids" jsonb,
        "min_order_amount" numeric(10,2),
        "max_discount_amount" numeric(10,2),
        "max_uses" integer,
        "max_uses_per_user" integer DEFAULT 1,
        "new_members_only" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "starts_at" timestamptz,
        "expires_at" timestamptz,
        "times_used" integer NOT NULL DEFAULT 0,
        "created_by" uuid REFERENCES "public"."profiles"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_coupons_code" ON "public"."coupons" ("code");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_coupons_status" ON "public"."coupons" ("status");`);

    // ── coupon_usages table ──────────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."coupon_usages" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        "coupon_id" uuid NOT NULL REFERENCES "public"."coupons"("id"),
        "user_id" uuid REFERENCES "public"."profiles"("id"),
        "guest_email" varchar(255),
        "order_id" uuid,
        "shop_order_id" uuid,
        "membership_id" uuid,
        "discount_applied" numeric(10,2) NOT NULL,
        "stripe_payment_intent_id" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_coupon_usages_coupon_id" ON "public"."coupon_usages" ("coupon_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_coupon_usages_user_id" ON "public"."coupon_usages" ("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_coupon_usages_guest_email" ON "public"."coupon_usages" ("guest_email");`);

    // ── Add discount/coupon fields to shop_orders ────────────────────────────
    this.addSql(`
      ALTER TABLE "public"."shop_orders"
        ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "coupon_code" varchar(50);
    `);

    // ── Add coupon_code to billing orders (discount column already exists) ───
    this.addSql(`
      ALTER TABLE "public"."orders"
        ADD COLUMN IF NOT EXISTS "coupon_code" varchar(50);
    `);

    // ── Add coupon_code to invoices (discount column already exists) ─────────
    this.addSql(`
      ALTER TABLE "public"."invoices"
        ADD COLUMN IF NOT EXISTS "coupon_code" varchar(50);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."coupon_usages";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."coupons";`);
    this.addSql(`ALTER TABLE "public"."shop_orders" DROP COLUMN IF EXISTS "discount_amount", DROP COLUMN IF EXISTS "coupon_code";`);
    this.addSql(`ALTER TABLE "public"."orders" DROP COLUMN IF EXISTS "coupon_code";`);
    this.addSql(`ALTER TABLE "public"."invoices" DROP COLUMN IF EXISTS "coupon_code";`);
  }
}
