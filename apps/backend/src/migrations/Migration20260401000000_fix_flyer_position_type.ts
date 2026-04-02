import { Migration } from '@mikro-orm/migrations';

export class Migration20260401000000_fix_flyer_position_type extends Migration {
  override async up(): Promise<void> {
    // The flyer_image_position column was created as 'text' in the baseline
    // but the entity declares it as 'json'. Change the column type to jsonb
    // so MikroORM can properly read/write JSON values.
    this.addSql(`
      ALTER TABLE "public"."events"
      ALTER COLUMN "flyer_image_position" TYPE jsonb
      USING CASE
        WHEN "flyer_image_position" IS NULL THEN NULL
        WHEN "flyer_image_position"::text = '' THEN NULL
        ELSE "flyer_image_position"::jsonb
      END;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."events"
      ALTER COLUMN "flyer_image_position" TYPE text
      USING "flyer_image_position"::text;
    `);
  }
}
