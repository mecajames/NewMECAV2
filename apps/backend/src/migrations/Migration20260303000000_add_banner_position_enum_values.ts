import { Migration } from '@mikro-orm/migrations';

export class Migration20260303000000_add_banner_position_enum_values extends Migration {
  async up(): Promise<void> {
    // The banner_position enum was originally created with only 'events_page_top'.
    // The TypeScript BannerPosition enum has 9 values. Add the missing 8 values.
    // Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL,
    // so we use individual addSql calls for each value.
    this.addSql(`ALTER TYPE banner_position ADD VALUE IF NOT EXISTS 'homepage_top';`);
    this.addSql(`ALTER TYPE banner_position ADD VALUE IF NOT EXISTS 'homepage_mid';`);
    this.addSql(`ALTER TYPE banner_position ADD VALUE IF NOT EXISTS 'homepage_bottom';`);
    this.addSql(`ALTER TYPE banner_position ADD VALUE IF NOT EXISTS 'shop_top';`);
    this.addSql(`ALTER TYPE banner_position ADD VALUE IF NOT EXISTS 'results_top';`);
    this.addSql(`ALTER TYPE banner_position ADD VALUE IF NOT EXISTS 'leaderboard_top';`);
    this.addSql(`ALTER TYPE banner_position ADD VALUE IF NOT EXISTS 'members_top';`);
    this.addSql(`ALTER TYPE banner_position ADD VALUE IF NOT EXISTS 'sidebar';`);
  }

  async down(): Promise<void> {
    // PostgreSQL does not support removing values from an enum type.
    // To reverse this, you would need to create a new enum, migrate the column, and drop the old enum.
    // This is intentionally left as a no-op since these values should persist.
  }
}
