import { Migration } from '@mikro-orm/migrations';

/**
 * Add team_addon_price field to membership_type_configs.
 * This is the price to add a team to a competitor membership.
 * Only applies to COMPETITOR category memberships.
 */
export class Migration20251225231000_add_team_addon_price extends Migration {

  override async up(): Promise<void> {
    // Add team_addon_price column
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_name = 'membership_type_configs'
                      AND column_name = 'team_addon_price') THEN
          ALTER TABLE membership_type_configs
          ADD COLUMN team_addon_price decimal(10,2) DEFAULT 25.00;
        END IF;
      END $$;
    `);

    // Set default team addon price for competitor memberships
    this.addSql(`
      UPDATE membership_type_configs
      SET team_addon_price = 25.00
      WHERE category = 'competitor' AND team_addon_price IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE membership_type_configs DROP COLUMN IF EXISTS team_addon_price;`);
  }
}
