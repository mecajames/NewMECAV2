import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Permission, RolePermission, UserPermissionOverride } from './permission.entity';

@Injectable()
export class PermissionsService {
  constructor(private readonly em: EntityManager) {}

  // Permissions CRUD
  async findAll() {
    return this.em.find(Permission, {});
  }

  async findById(id: string) {
    return this.em.findOne(Permission, { id });
  }

  async findByCategory(category: string) {
    return this.em.find(Permission, { category });
  }

  async create(data: Partial<Permission>) {
    const permission = this.em.create(Permission, data);
    await this.em.persistAndFlush(permission);
    return permission;
  }

  async update(id: string, data: Partial<Permission>) {
    const permission = await this.em.findOneOrFail(Permission, { id });
    this.em.assign(permission, data);
    await this.em.flush();
    return permission;
  }

  async delete(id: string) {
    const permission = await this.em.findOneOrFail(Permission, { id });
    await this.em.removeAndFlush(permission);
  }

  // Role Permissions
  async getRolePermissions(role: string) {
    return this.em.find(RolePermission, { role });
  }

  async assignPermissionToRole(role: string, permissionId: string) {
    const rolePermission = this.em.create(RolePermission, { role, permissionId });
    await this.em.persistAndFlush(rolePermission);
    return rolePermission;
  }

  async removePermissionFromRole(role: string, permissionId: string) {
    const rolePermission = await this.em.findOne(RolePermission, { role, permissionId });
    if (rolePermission) {
      await this.em.removeAndFlush(rolePermission);
    }
  }

  // User Permission Overrides
  async getUserOverrides(userId: string) {
    return this.em.find(UserPermissionOverride, { userId });
  }

  async grantPermissionToUser(userId: string, permissionId: string) {
    const existing = await this.em.findOne(UserPermissionOverride, { userId, permissionId });
    if (existing) {
      existing.granted = true;
      await this.em.flush();
      return existing;
    }
    const override = this.em.create(UserPermissionOverride, { userId, permissionId, granted: true });
    await this.em.persistAndFlush(override);
    return override;
  }

  async revokePermissionFromUser(userId: string, permissionId: string) {
    const existing = await this.em.findOne(UserPermissionOverride, { userId, permissionId });
    if (existing) {
      existing.granted = false;
      await this.em.flush();
      return existing;
    }
    const override = this.em.create(UserPermissionOverride, { userId, permissionId, granted: false });
    await this.em.persistAndFlush(override);
    return override;
  }

  async removeUserOverride(userId: string, permissionId: string) {
    const override = await this.em.findOne(UserPermissionOverride, { userId, permissionId });
    if (override) {
      await this.em.removeAndFlush(override);
    }
  }

  // Get effective permissions for a user
  async getUserEffectivePermissions(userId: string, role: string) {
    const rolePerms = await this.getRolePermissions(role);
    const overrides = await this.getUserOverrides(userId);

    return {
      rolePermissions: rolePerms,
      overrides: overrides,
    };
  }
}
