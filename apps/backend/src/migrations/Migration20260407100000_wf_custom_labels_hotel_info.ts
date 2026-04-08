import { Migration } from '@mikro-orm/migrations';

export class Migration20260407100000_wf_custom_labels_hotel_info extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."world_finals_registration_config"
      ADD COLUMN IF NOT EXISTS "hotel_info_text" text,
      ADD COLUMN IF NOT EXISTS "tshirt_field_label" text,
      ADD COLUMN IF NOT EXISTS "ring_field_label" text,
      ADD COLUMN IF NOT EXISTS "hotel_field_label" text,
      ADD COLUMN IF NOT EXISTS "guest_count_field_label" text,
      ADD COLUMN IF NOT EXISTS "extra_tshirt_field_label" text,
      ADD COLUMN IF NOT EXISTS "registration_image_url" text;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."world_finals_registration_config"
      DROP COLUMN IF EXISTS "hotel_info_text",
      DROP COLUMN IF EXISTS "tshirt_field_label",
      DROP COLUMN IF EXISTS "ring_field_label",
      DROP COLUMN IF EXISTS "hotel_field_label",
      DROP COLUMN IF EXISTS "guest_count_field_label",
      DROP COLUMN IF EXISTS "extra_tshirt_field_label",
      DROP COLUMN IF EXISTS "registration_image_url";`);
  }
}
