import { Migration } from '@mikro-orm/migrations';

export class Migration20260225100000_create_seo_overrides extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."seo_overrides" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "url_path" TEXT NOT NULL UNIQUE,
        "title" TEXT,
        "description" TEXT,
        "canonical_url" TEXT,
        "noindex" BOOLEAN NOT NULL DEFAULT false,
        "og_image" TEXT,
        "updated_by" UUID REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_seo_overrides_url_path" ON "public"."seo_overrides" ("url_path");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."seo_overrides";`);
  }
}
