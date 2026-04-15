import { Migration } from '@mikro-orm/migrations';

/**
 * Seeds the permissions and role_permissions tables.
 * These tables already exist in the DB but were never populated
 * after the permissions module code was removed.
 */
export class Migration20260414000000_seed_permissions extends Migration {
  async up(): Promise<void> {
    // ── 1. Seed permissions ─────────────────────────────────────
    // Use ON CONFLICT to be idempotent (safe to run multiple times)
    this.addSql(`
      INSERT INTO permissions (id, name, description, category, created_at) VALUES
        -- Users
        (gen_random_uuid(), 'view_users', 'View user profiles and member list', 'users', NOW()),
        (gen_random_uuid(), 'edit_user', 'Edit user profiles', 'users', NOW()),
        (gen_random_uuid(), 'create_user', 'Create new user accounts', 'users', NOW()),
        (gen_random_uuid(), 'manage_users', 'Full user management (includes edit + create)', 'users', NOW()),

        -- Events
        (gen_random_uuid(), 'view_events', 'View events', 'events', NOW()),
        (gen_random_uuid(), 'create_event', 'Create new events', 'events', NOW()),
        (gen_random_uuid(), 'edit_event', 'Edit existing events', 'events', NOW()),
        (gen_random_uuid(), 'manage_events', 'Full event management', 'events', NOW()),
        (gen_random_uuid(), 'manage_registrations', 'Manage event registrations', 'events', NOW()),

        -- Competition
        (gen_random_uuid(), 'view_results', 'View competition results', 'competition', NOW()),
        (gen_random_uuid(), 'enter_results', 'Enter competition scores', 'competition', NOW()),
        (gen_random_uuid(), 'edit_results', 'Edit existing results', 'competition', NOW()),

        -- Content
        (gen_random_uuid(), 'manage_media', 'Upload and manage media files', 'content', NOW()),
        (gen_random_uuid(), 'manage_directory_listings', 'Manage retailer/manufacturer listings', 'content', NOW()),
        (gen_random_uuid(), 'manage_business_listings', 'Manage business directory', 'content', NOW()),
        (gen_random_uuid(), 'manage_banner_ads', 'Manage banner advertisements', 'content', NOW()),
        (gen_random_uuid(), 'manage_rulebooks', 'Upload and manage rulebooks', 'content', NOW()),

        -- Communication
        (gen_random_uuid(), 'send_emails', 'Send bulk/system emails', 'communication', NOW()),
        (gen_random_uuid(), 'send_sms', 'Send SMS messages', 'communication', NOW()),
        (gen_random_uuid(), 'send_system_messages', 'Send system notifications', 'communication', NOW()),

        -- Financial
        (gen_random_uuid(), 'view_orders', 'View order history', 'financial', NOW()),
        (gen_random_uuid(), 'manage_shop', 'Manage shop products', 'financial', NOW()),
        (gen_random_uuid(), 'manage_invoices', 'Create and manage invoices', 'financial', NOW()),
        (gen_random_uuid(), 'manage_billing', 'Manage billing and payments', 'financial', NOW()),

        -- System
        (gen_random_uuid(), 'manage_permissions', 'Create/edit/delete permissions and role assignments', 'system', NOW()),
        (gen_random_uuid(), 'view_analytics', 'View analytics dashboard', 'system', NOW()),
        (gen_random_uuid(), 'manage_site_settings', 'Modify site configuration', 'system', NOW()),
        (gen_random_uuid(), 'manage_seasons', 'Manage competition seasons', 'system', NOW()),
        (gen_random_uuid(), 'manage_tickets', 'Manage support tickets', 'system', NOW())
      ON CONFLICT (name) DO NOTHING;
    `);

    // ── 2. Seed role_permissions ─────────────────────────────────
    // event_director permissions
    this.addSql(`
      INSERT INTO role_permissions (id, role, permission_id, created_at)
      SELECT gen_random_uuid(), 'event_director', p.id, NOW()
      FROM permissions p
      WHERE p.name IN (
        'view_events', 'create_event', 'edit_event', 'manage_events',
        'manage_registrations',
        'view_results', 'enter_results', 'edit_results',
        'manage_media',
        'view_users'
      )
      ON CONFLICT DO NOTHING;
    `);

    // judge permissions
    this.addSql(`
      INSERT INTO role_permissions (id, role, permission_id, created_at)
      SELECT gen_random_uuid(), 'judge', p.id, NOW()
      FROM permissions p
      WHERE p.name IN (
        'view_events',
        'view_results', 'enter_results',
        'view_users'
      )
      ON CONFLICT DO NOTHING;
    `);

    // retailer permissions
    this.addSql(`
      INSERT INTO role_permissions (id, role, permission_id, created_at)
      SELECT gen_random_uuid(), 'retailer', p.id, NOW()
      FROM permissions p
      WHERE p.name IN (
        'view_events', 'view_results',
        'manage_directory_listings', 'manage_business_listings',
        'manage_banner_ads'
      )
      ON CONFLICT DO NOTHING;
    `);

    // user (competitor) base permissions
    this.addSql(`
      INSERT INTO role_permissions (id, role, permission_id, created_at)
      SELECT gen_random_uuid(), 'user', p.id, NOW()
      FROM permissions p
      WHERE p.name IN (
        'view_events', 'view_results'
      )
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DELETE FROM role_permissions WHERE role IN ('event_director', 'judge', 'retailer', 'user');`);
    this.addSql(`DELETE FROM permissions;`);
  }
}
