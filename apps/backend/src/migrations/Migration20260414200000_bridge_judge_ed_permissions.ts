import { Migration } from '@mikro-orm/migrations';

/**
 * Bridge migration: creates apply_judge and apply_event_director permissions
 * and seeds user_permission_overrides from existing profile columns.
 *
 * The can_apply_judge and can_apply_event_director columns on profiles
 * remain functional for now. This migration creates the permission system
 * equivalents so the ManagePermissionsPage can manage them going forward.
 *
 * A future migration will remove the profile columns once all code
 * has been updated to check permissions instead.
 */
export class Migration20260414200000_bridge_judge_ed_permissions extends Migration {
  async up(): Promise<void> {
    // 1. Add the permissions if they don't exist
    this.addSql(`
      INSERT INTO permissions (id, name, description, category, created_at) VALUES
        (gen_random_uuid(), 'apply_judge', 'Permission to access judge application and features', 'competition', NOW()),
        (gen_random_uuid(), 'apply_event_director', 'Permission to access event director application and features', 'events', NOW())
      ON CONFLICT (name) DO NOTHING;
    `);

    // 2. Create user_permission_overrides for everyone who currently has can_apply_judge = true
    this.addSql(`
      INSERT INTO user_permission_overrides (id, user_id, permission_id, granted, created_at)
      SELECT gen_random_uuid(), p.id, perm.id, true, NOW()
      FROM profiles p
      CROSS JOIN permissions perm
      WHERE p.can_apply_judge = true
        AND perm.name = 'apply_judge'
      ON CONFLICT DO NOTHING;
    `);

    // 3. Create user_permission_overrides for everyone who currently has can_apply_event_director = true
    this.addSql(`
      INSERT INTO user_permission_overrides (id, user_id, permission_id, granted, created_at)
      SELECT gen_random_uuid(), p.id, perm.id, true, NOW()
      FROM profiles p
      CROSS JOIN permissions perm
      WHERE p.can_apply_event_director = true
        AND perm.name = 'apply_event_director'
      ON CONFLICT DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    // Remove the bridge overrides (the profile columns remain untouched)
    this.addSql(`
      DELETE FROM user_permission_overrides
      WHERE permission_id IN (
        SELECT id FROM permissions WHERE name IN ('apply_judge', 'apply_event_director')
      );
    `);

    this.addSql(`
      DELETE FROM permissions WHERE name IN ('apply_judge', 'apply_event_director');
    `);
  }
}
