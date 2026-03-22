import { Migration } from '@mikro-orm/migrations';

export class Migration20260322000000_score_sheet_tables extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."score_sheet_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "template_key" text NOT NULL,
        "display_name" text NOT NULL,
        "image_data" bytea NOT NULL,
        "coords" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "score_sheet_templates_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "score_sheet_templates_template_key_unique" UNIQUE ("template_key")
      );
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."score_sheet_config" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "config_key" text NOT NULL,
        "config_value" jsonb NOT NULL DEFAULT '{}',
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "score_sheet_config_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "score_sheet_config_config_key_unique" UNIQUE ("config_key")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS "public"."score_sheet_config";');
    this.addSql('DROP TABLE IF EXISTS "public"."score_sheet_templates";');
  }
}
