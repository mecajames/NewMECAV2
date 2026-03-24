import { Migration } from '@mikro-orm/migrations';

export class Migration20260324000000_forever_members extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."forever_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "meca_id" text NOT NULL,
        "full_name" text NOT NULL,
        "photo_url" text,
        "bio" text,
        "quote" text,
        "date_of_birth" date,
        "date_of_passing" date,
        "member_since" date,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT false,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "forever_members_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "forever_members_meca_id_unique" UNIQUE ("meca_id")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS "public"."forever_members";');
  }
}
