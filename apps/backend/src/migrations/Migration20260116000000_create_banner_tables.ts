import { Migration } from '@mikro-orm/migrations';

export class Migration20260116000000_create_banner_tables extends Migration {
  async up(): Promise<void> {
    // Create banner_position enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE banner_position AS ENUM ('events_page_top');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create banner_status enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE banner_status AS ENUM ('draft', 'active', 'paused', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create advertisers table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "advertisers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_name" text NOT NULL,
        "contact_name" text NOT NULL,
        "contact_email" text NOT NULL,
        "contact_phone" text,
        "website" text,
        "notes" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create banners table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "banners" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "image_url" text NOT NULL,
        "click_url" text,
        "position" banner_position NOT NULL,
        "status" banner_status NOT NULL DEFAULT 'draft',
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "priority" integer NOT NULL DEFAULT 0,
        "advertiser_id" uuid NOT NULL REFERENCES "advertisers"("id") ON DELETE CASCADE,
        "alt_text" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create banner_engagements table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "banner_engagements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "banner_id" uuid NOT NULL REFERENCES "banners"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "impressions" integer NOT NULL DEFAULT 0,
        "clicks" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE("banner_id", "date")
      );
    `);

    // Create indexes for advertisers
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_advertisers_is_active" ON "advertisers"("is_active");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_advertisers_company_name" ON "advertisers"("company_name");');

    // Create indexes for banners
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_banners_position_status_dates" ON "banners"("position", "status", "start_date", "end_date");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_banners_advertiser" ON "banners"("advertiser_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_banners_status" ON "banners"("status");');

    // Create indexes for banner_engagements
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_banner_engagements_banner_date" ON "banner_engagements"("banner_id", "date");');

    // Enable RLS on banner tables
    this.addSql('ALTER TABLE "advertisers" ENABLE ROW LEVEL SECURITY;');
    this.addSql('ALTER TABLE "banners" ENABLE ROW LEVEL SECURITY;');
    this.addSql('ALTER TABLE "banner_engagements" ENABLE ROW LEVEL SECURITY;');

    // Create RLS policies for advertisers (admin only)
    this.addSql(`
      CREATE POLICY "advertisers_select_policy" ON "advertisers"
        FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "advertisers_insert_policy" ON "advertisers"
        FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "advertisers_update_policy" ON "advertisers"
        FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "advertisers_delete_policy" ON "advertisers"
        FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
    `);

    // Create RLS policies for banners (public read for active banners within date range, admin for all operations)
    this.addSql(`
      CREATE POLICY "banners_select_policy" ON "banners"
        FOR SELECT USING (
          (status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE)
          OR auth.jwt() ->> 'role' = 'admin'
        );
    `);

    this.addSql(`
      CREATE POLICY "banners_insert_policy" ON "banners"
        FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "banners_update_policy" ON "banners"
        FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "banners_delete_policy" ON "banners"
        FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
    `);

    // Create RLS policies for banner_engagements (public insert for tracking, admin for read/update/delete)
    this.addSql(`
      CREATE POLICY "banner_engagements_select_policy" ON "banner_engagements"
        FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "banner_engagements_insert_policy" ON "banner_engagements"
        FOR INSERT WITH CHECK (true);
    `);

    this.addSql(`
      CREATE POLICY "banner_engagements_update_policy" ON "banner_engagements"
        FOR UPDATE USING (true);
    `);
  }

  async down(): Promise<void> {
    // Drop RLS policies
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_update_policy" ON "banner_engagements";');
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_insert_policy" ON "banner_engagements";');
    this.addSql('DROP POLICY IF EXISTS "banner_engagements_select_policy" ON "banner_engagements";');
    this.addSql('DROP POLICY IF EXISTS "banners_delete_policy" ON "banners";');
    this.addSql('DROP POLICY IF EXISTS "banners_update_policy" ON "banners";');
    this.addSql('DROP POLICY IF EXISTS "banners_insert_policy" ON "banners";');
    this.addSql('DROP POLICY IF EXISTS "banners_select_policy" ON "banners";');
    this.addSql('DROP POLICY IF EXISTS "advertisers_delete_policy" ON "advertisers";');
    this.addSql('DROP POLICY IF EXISTS "advertisers_update_policy" ON "advertisers";');
    this.addSql('DROP POLICY IF EXISTS "advertisers_insert_policy" ON "advertisers";');
    this.addSql('DROP POLICY IF EXISTS "advertisers_select_policy" ON "advertisers";');

    // Drop tables
    this.addSql('DROP TABLE IF EXISTS "banner_engagements" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "banners" CASCADE;');
    this.addSql('DROP TABLE IF EXISTS "advertisers" CASCADE;');

    // Drop enum types
    this.addSql('DROP TYPE IF EXISTS banner_status CASCADE;');
    this.addSql('DROP TYPE IF EXISTS banner_position CASCADE;');
  }
}
