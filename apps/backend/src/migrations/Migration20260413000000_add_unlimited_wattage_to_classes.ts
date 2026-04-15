import { Migration } from '@mikro-orm/migrations';

export class Migration20260413000000_add_unlimited_wattage_to_classes extends Migration {
  async up(): Promise<void> {
    // Add unlimited_wattage boolean column (defaults to false)
    this.addSql(`
      ALTER TABLE "public"."competition_classes"
      ADD COLUMN IF NOT EXISTS "unlimited_wattage" boolean NOT NULL DEFAULT false;
    `);

    // Backfill: set unlimited_wattage = true for known unlimited classes
    // Matches by abbreviation or full name (case-insensitive)
    // Classes not yet in the DB (e.g. PNP5, BBMS2, CCS2) can be configured
    // via the "Unlimited Wattage" checkbox in admin class management when created.
    this.addSql(`
      UPDATE "public"."competition_classes"
      SET "unlimited_wattage" = true
      WHERE LOWER("abbreviation") IN (
        't2', 's5', 'ms4', 'm5',
        'xst2', 'xms2', 'xcc', 'x',
        'pnp5', 'pnpx',
        'bbms2', 'bbm5', 'bbx',
        'ccs2', 'ccms2', 'ccm5', 'ccx'
      )
      OR LOWER("name") IN (
        'trunk 2', 'street 5', 'modified street 4', 'modified 5',
        'x street 2', 'extreme',
        'x modified street 2', 'x competition cruiser',
        'plug n play 5', 'plug n play extreme',
        'big boy modified street 2', 'big boy modified 5', 'big boy extreme',
        'competition cruiser street 2', 'competition cruiser modified street 2',
        'competition cruiser modified 5', 'competition cruiser extreme'
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."competition_classes" DROP COLUMN IF EXISTS "unlimited_wattage";`);
  }
}
