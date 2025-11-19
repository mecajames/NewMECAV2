import { Migration } from '@mikro-orm/migrations';

export class Migration20251108000001_add_format_abbreviation extends Migration {

  async up(): Promise<void> {
    this.addSql('ALTER TABLE "competition_formats" ADD COLUMN IF NOT EXISTS "abbreviation" text NULL;');
    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "competition_formats" ADD CONSTRAINT "competition_formats_abbreviation_unique" UNIQUE ("abbreviation");
      EXCEPTION
        WHEN duplicate_table THEN NULL;
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "competition_formats" DROP CONSTRAINT IF EXISTS "competition_formats_abbreviation_unique";');
    this.addSql('ALTER TABLE "competition_formats" DROP COLUMN IF EXISTS "abbreviation";');
  }

}
