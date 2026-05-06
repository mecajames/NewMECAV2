import { Migration } from '@mikro-orm/migrations';

/**
 * Adds a `section` text column to competition_classes so each class can be
 * grouped under a sub-heading inside its format (e.g. SPL → "Park n Pound",
 * "Radical X", "Dueling Demos"). Mirrors the V1 results UI which rendered
 * each format as a series of named panels.
 *
 * Backfill of existing rows is done in a follow-up migration so this one
 * stays a pure schema change.
 */
export class Migration20260505140000_add_section_to_competition_classes extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."competition_classes"
      ADD COLUMN IF NOT EXISTS "section" TEXT NULL;
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "competition_classes_section_idx"
      ON "public"."competition_classes" ("section");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "public"."competition_classes_section_idx";`);
    this.addSql(`ALTER TABLE "public"."competition_classes" DROP COLUMN IF EXISTS "section";`);
  }
}
