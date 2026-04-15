import { Migration } from '@mikro-orm/migrations';

/**
 * Creates a roles table for proper CRUD management of roles.
 * Seeds it with the existing roles found in role_permissions.
 */
export class Migration20260414300000_create_roles_table extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL UNIQUE,
        "display_name" text NOT NULL,
        "description" text,
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    // Seed from existing roles in role_permissions + known system roles
    this.addSql(`
      INSERT INTO roles (name, display_name, description, is_system) VALUES
        ('admin', 'Admin', 'Full system access — all permissions implicit', true),
        ('competitor', 'Competitor', 'Standard competitor membership role', false),
        ('event_director', 'Event Director', 'Can create and manage events, registrations, and results', false),
        ('judge', 'Judge', 'Can view events and enter competition results', false),
        ('retailer', 'Retailer', 'Can manage directory listings and banner ads', false),
        ('manufacturer', 'Manufacturer', 'Can manage directory listings and banner ads', false)
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        is_system = EXCLUDED.is_system;
    `);

    // Also seed any other roles found in role_permissions
    this.addSql(`
      INSERT INTO roles (name, display_name, description, is_system)
      SELECT DISTINCT rp.role::text, INITCAP(REPLACE(rp.role::text, '_', ' ')), NULL, false
      FROM role_permissions rp
      WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.name = rp.role::text)
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."roles";`);
  }
}
