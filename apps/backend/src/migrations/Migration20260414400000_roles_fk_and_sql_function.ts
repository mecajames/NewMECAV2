import { Migration } from '@mikro-orm/migrations';

/**
 * 1. Adds FK from role_permissions.role to roles.name for referential integrity.
 * 2. Updates check_user_permission SQL function to also check is_staff column.
 */
export class Migration20260414400000_roles_fk_and_sql_function extends Migration {
  async up(): Promise<void> {
    // 1. Change role_permissions.role from user_role enum to text (to match roles.name which is text)
    this.addSql(`ALTER TABLE role_permissions ALTER COLUMN role TYPE text USING role::text;`);

    // 2. Add FK constraint
    this.addSql(`
      ALTER TABLE role_permissions
      ADD CONSTRAINT fk_role_permissions_role
      FOREIGN KEY (role) REFERENCES roles(name)
      ON UPDATE CASCADE ON DELETE CASCADE;
    `);

    // 3. Update check_user_permission to also check is_staff
    this.addSql(`
      CREATE OR REPLACE FUNCTION check_user_permission(p_user_id uuid, p_permission_name text)
      RETURNS boolean
      LANGUAGE plpgsql SECURITY DEFINER
      AS $$
      DECLARE
        v_role text;
        v_is_staff boolean;
        has_permission boolean;
      BEGIN
        SELECT role::text, is_staff INTO v_role, v_is_staff FROM profiles WHERE id = p_user_id;

        -- Admin role or is_staff flag grants all permissions
        IF v_role = 'admin' OR v_is_staff = true THEN
          RETURN true;
        END IF;

        -- Check user-specific overrides first (most specific)
        SELECT granted INTO has_permission
        FROM user_permission_overrides upo
        JOIN permissions p ON p.id = upo.permission_id
        WHERE upo.user_id = p_user_id AND p.name = p_permission_name;

        IF has_permission IS NOT NULL THEN
          RETURN has_permission;
        END IF;

        -- Check role-based permissions
        SELECT COUNT(*) > 0 INTO has_permission
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role = v_role AND p.name = p_permission_name;

        RETURN COALESCE(has_permission, false);
      END;
      $$;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS fk_role_permissions_role;`);
    this.addSql(`ALTER TABLE role_permissions ALTER COLUMN role TYPE user_role USING role::user_role;`);

    // Restore original function without is_staff check
    this.addSql(`
      CREATE OR REPLACE FUNCTION check_user_permission(p_user_id uuid, p_permission_name text)
      RETURNS boolean
      LANGUAGE plpgsql SECURITY DEFINER
      AS $$
      DECLARE
        user_role user_role;
        has_permission boolean;
      BEGIN
        SELECT role INTO user_role FROM profiles WHERE id = p_user_id;
        IF user_role = 'admin' THEN RETURN true; END IF;
        SELECT COUNT(*) > 0 INTO has_permission
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role = user_role AND p.name = p_permission_name;
        RETURN COALESCE(has_permission, false);
      END;
      $$;
    `);
  }
}
