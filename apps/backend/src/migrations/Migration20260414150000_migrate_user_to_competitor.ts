import { Migration } from '@mikro-orm/migrations';

/**
 * Data migration: converts existing 'user' role rows to 'competitor'
 * and seeds role_permissions for the new roles.
 *
 * This runs after Migration20260414100000 which added the enum values.
 */
export class Migration20260414150000_migrate_user_to_competitor extends Migration {
  async up(): Promise<void> {
    // Migrate existing 'user' rows to 'competitor'
    this.addSql(`UPDATE profiles SET role = 'competitor' WHERE role = 'user';`);

    // Copy role_permissions from 'user' to 'competitor'
    this.addSql(`
      INSERT INTO role_permissions (id, role, permission_id, created_at)
      SELECT gen_random_uuid(), 'competitor', permission_id, NOW()
      FROM role_permissions
      WHERE role = 'user'
      ON CONFLICT DO NOTHING;
    `);

    // Manufacturer gets directory + listing permissions
    this.addSql(`
      INSERT INTO role_permissions (id, role, permission_id, created_at)
      SELECT gen_random_uuid(), 'manufacturer', p.id, NOW()
      FROM permissions p
      WHERE p.name IN (
        'view_events', 'view_results',
        'manage_directory_listings', 'manage_business_listings',
        'manage_banner_ads'
      )
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`UPDATE profiles SET role = 'user' WHERE role = 'competitor';`);
    this.addSql(`DELETE FROM role_permissions WHERE role IN ('competitor', 'manufacturer');`);
  }
}
