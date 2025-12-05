import { Migration } from '@mikro-orm/migrations';

export class Migration20251202235959_create_membership_type_configs_table extends Migration {
  async up(): Promise<void> {
    // Create membership_category enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE membership_category AS ENUM ('competitor', 'team', 'retail', 'manufacturer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create manufacturer_tier enum type (for tiered manufacturer pricing)
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE manufacturer_tier AS ENUM ('bronze', 'silver', 'gold');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create membership_type_configs table
    // Note: All memberships are annual, no duration column needed
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "membership_type_configs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "description" text,
        "category" membership_category NOT NULL,
        "tier" manufacturer_tier,
        "price" decimal(10,2) NOT NULL,
        "currency" varchar(3) DEFAULT 'USD',
        "benefits" jsonb,
        "required_fields" jsonb,
        "optional_fields" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_featured" boolean NOT NULL DEFAULT false,
        "show_on_public_site" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "stripe_price_id" text,
        "stripe_product_id" text,
        "quickbooks_item_id" text,
        "quickbooks_account_id" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create indexes
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_membership_configs_category" ON "membership_type_configs"("category");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_membership_configs_tier" ON "membership_type_configs"("tier");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_membership_configs_active" ON "membership_type_configs"("is_active");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_membership_configs_featured" ON "membership_type_configs"("is_featured");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_membership_configs_public" ON "membership_type_configs"("show_on_public_site");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_membership_configs_display_order" ON "membership_type_configs"("display_order");');
    this.addSql('CREATE UNIQUE INDEX IF NOT EXISTS "idx_membership_configs_name" ON "membership_type_configs"("name");');
  }

  async down(): Promise<void> {
    // Drop membership_type_configs table
    this.addSql('DROP TABLE IF EXISTS "membership_type_configs" CASCADE;');

    // Drop manufacturer_tier enum
    this.addSql('DROP TYPE IF EXISTS manufacturer_tier CASCADE;');

    // Drop membership_category enum
    this.addSql('DROP TYPE IF EXISTS membership_category CASCADE;');
  }
}
