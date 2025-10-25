import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'permissions', schema: 'public' })
export class Permission {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text', unique: true })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text' })
  category!: string;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();
}

@Entity({ tableName: 'role_permissions', schema: 'public' })
export class RolePermission {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  role!: string;

  @Property({ type: 'uuid' })
  permissionId!: string;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();
}

@Entity({ tableName: 'user_permission_overrides', schema: 'public' })
export class UserPermissionOverride {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid' })
  userId!: string;

  @Property({ type: 'uuid' })
  permissionId!: string;

  @Property({ type: 'boolean' })
  granted!: boolean;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();
}
