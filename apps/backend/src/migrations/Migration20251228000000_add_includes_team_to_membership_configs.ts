import { Migration } from '@mikro-orm/migrations';

export class Migration20251228000000 extends Migration {
  async up(): Promise<void> {
    // Add includes_team column to membership_type_configs
    this.addSql(`
      ALTER TABLE "membership_type_configs"
      ADD COLUMN IF NOT EXISTS "includes_team" boolean NOT NULL DEFAULT false;
    `);

    // Set includes_team = true for membership types that include team in their name
    // This handles "Competitor Membership w/Team" type configs
    this.addSql(`
      UPDATE "membership_type_configs"
      SET "includes_team" = true
      WHERE LOWER(name) LIKE '%w/team%'
         OR LOWER(name) LIKE '%with team%'
         OR LOWER(name) LIKE '%team membership%';
    `);

    // Also ensure Retailer and Manufacturer memberships have includes_team = true
    // (though they get team by category, this ensures consistency)
    this.addSql(`
      UPDATE "membership_type_configs"
      SET "includes_team" = true
      WHERE category IN ('retail', 'manufacturer');
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "membership_type_configs"
      DROP COLUMN IF EXISTS "includes_team";
    `);
  }
}
