import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Role, Permission, RolePermission, UserPermissionOverride } from './permission.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly em: EntityManager) {}

  // ── Roles CRUD ────────────────────────────────────────────────

  async findAllRoles(): Promise<Role[]> {
    return this.em.find(Role, {}, { orderBy: { name: 'ASC' } });
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return this.em.findOne(Role, { name });
  }

  async createRole(data: { name: string; displayName: string; description?: string }): Promise<Role> {
    const existing = await this.em.findOne(Role, { name: data.name });
    if (existing) throw new BadRequestException(`Role "${data.name}" already exists`);

    const role = this.em.create(Role, {
      name: data.name,
      displayName: data.displayName,
      description: data.description,
    } as any);
    await this.em.persistAndFlush(role);
    return role;
  }

  async updateRole(id: string, data: { displayName?: string; description?: string }): Promise<Role> {
    const role = await this.em.findOneOrFail(Role, { id });
    if (data.displayName !== undefined) role.displayName = data.displayName;
    if (data.description !== undefined) role.description = data.description || undefined;
    await this.em.flush();
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.em.findOneOrFail(Role, { id });
    if (role.isSystem) throw new BadRequestException(`Cannot delete system role "${role.name}"`);

    // Remove all role_permissions for this role
    const rolePerms = await this.em.find(RolePermission, { role: role.name });
    if (rolePerms.length > 0) {
      await this.em.removeAndFlush(rolePerms);
    }

    await this.em.removeAndFlush(role);
  }

  // ── Permissions CRUD ──────────────────────────────────────────

  async findAll(): Promise<Permission[]> {
    return this.em.find(Permission, {}, { orderBy: { category: 'ASC', name: 'ASC' } });
  }

  async findById(id: string): Promise<Permission | null> {
    return this.em.findOne(Permission, { id });
  }

  async findByCategory(category: string): Promise<Permission[]> {
    return this.em.find(Permission, { category }, { orderBy: { name: 'ASC' } });
  }

  async create(data: Partial<Permission>): Promise<Permission> {
    const permission = this.em.create(Permission, data as any);
    await this.em.persistAndFlush(permission);
    return permission;
  }

  async update(id: string, data: Partial<Permission>): Promise<Permission> {
    const permission = await this.em.findOneOrFail(Permission, { id });
    this.em.assign(permission, data);
    await this.em.flush();
    return permission;
  }

  async delete(id: string): Promise<void> {
    const permission = await this.em.findOneOrFail(Permission, { id });
    await this.em.removeAndFlush(permission);
  }

  // ── Role Permissions ──────────────────────────────────────────

  async getRolePermissions(role: string): Promise<RolePermission[]> {
    return this.em.find(RolePermission, { role }, { populate: ['permission'] });
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return this.em.find(RolePermission, {}, { populate: ['permission'], orderBy: { role: 'ASC' } });
  }

  async assignPermissionToRole(role: string, permissionId: string): Promise<RolePermission> {
    const permission = await this.em.findOneOrFail(Permission, { id: permissionId });
    const existing = await this.em.findOne(RolePermission, { role, permission });
    if (existing) return existing;

    const rolePermission = this.em.create(RolePermission, { role, permission });
    await this.em.persistAndFlush(rolePermission);
    return rolePermission;
  }

  async removePermissionFromRole(role: string, permissionId: string): Promise<void> {
    const permission = await this.em.findOneOrFail(Permission, { id: permissionId });
    const rolePermission = await this.em.findOne(RolePermission, { role, permission });
    if (rolePermission) {
      await this.em.removeAndFlush(rolePermission);
    }
  }

  // ── User Permission Overrides ─────────────────────────────────

  async getUserOverrides(userId: string): Promise<UserPermissionOverride[]> {
    return this.em.find(UserPermissionOverride, { user: userId }, { populate: ['permission'] });
  }

  async grantPermissionToUser(userId: string, permissionId: string): Promise<UserPermissionOverride> {
    const permission = await this.em.findOneOrFail(Permission, { id: permissionId });
    const existing = await this.em.findOne(UserPermissionOverride, { user: userId, permission });
    if (existing) {
      existing.granted = true;
      await this.em.flush();
      return existing;
    }
    const override = this.em.create(UserPermissionOverride, {
      user: userId,
      permission,
      granted: true,
    });
    await this.em.persistAndFlush(override);
    return override;
  }

  async revokePermissionFromUser(userId: string, permissionId: string): Promise<UserPermissionOverride> {
    const permission = await this.em.findOneOrFail(Permission, { id: permissionId });
    const existing = await this.em.findOne(UserPermissionOverride, { user: userId, permission });
    if (existing) {
      existing.granted = false;
      await this.em.flush();
      return existing;
    }
    const override = this.em.create(UserPermissionOverride, {
      user: userId,
      permission,
      granted: false,
    });
    await this.em.persistAndFlush(override);
    return override;
  }

  async removeUserOverride(userId: string, permissionId: string): Promise<void> {
    const permission = await this.em.findOneOrFail(Permission, { id: permissionId });
    const override = await this.em.findOne(UserPermissionOverride, { user: userId, permission });
    if (override) {
      await this.em.removeAndFlush(override);
    }
  }

  // ── Effective Permissions ─────────────────────────────────────

  /**
   * Returns the merged set of permission names for a user.
   * Logic: start with role permissions, then apply user overrides (grant/revoke).
   */
  async getUserEffectivePermissions(
    userId: string,
    role: string,
    isStaff: boolean,
    mecaId?: string,
  ): Promise<{ permissions: string[]; rolePermissions: string[]; overrides: { name: string; granted: boolean }[] }> {
    // Admins/staff get wildcard
    if (isAdminUser({ role, is_staff: isStaff, meca_id: mecaId })) {
      return { permissions: ['*'], rolePermissions: ['*'], overrides: [] };
    }

    const rolePerms = await this.getRolePermissions(role);
    const overrides = await this.getUserOverrides(userId);

    const permSet = new Set(rolePerms.map((rp) => rp.permission.name));

    const overrideList: { name: string; granted: boolean }[] = [];
    for (const o of overrides) {
      overrideList.push({ name: o.permission.name, granted: o.granted });
      if (o.granted) {
        permSet.add(o.permission.name);
      } else {
        permSet.delete(o.permission.name);
      }
    }

    return {
      permissions: Array.from(permSet).sort(),
      rolePermissions: rolePerms.map((rp) => rp.permission.name).sort(),
      overrides: overrideList,
    };
  }

  /**
   * Check if a specific user has a specific permission.
   * Used by the PermissionGuard.
   */
  async hasPermission(
    userId: string,
    role: string,
    isStaff: boolean,
    permissionName: string,
    mecaId?: string,
  ): Promise<boolean> {
    // Admins/staff have all permissions
    if (isAdminUser({ role, is_staff: isStaff, meca_id: mecaId })) {
      return true;
    }

    // Check user override first (most specific)
    const override = await this.em.findOne(UserPermissionOverride, {
      user: userId,
      permission: { name: permissionName },
    }, { populate: ['permission'] });

    if (override) {
      return override.granted;
    }

    // Check role permission
    const rolePerm = await this.em.findOne(RolePermission, {
      role,
      permission: { name: permissionName },
    }, { populate: ['permission'] });

    return !!rolePerm;
  }
}
