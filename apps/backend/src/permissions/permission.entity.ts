import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'roles', schema: 'public' })
export class Role {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true })
  name!: string;

  @Property({ type: 'text', fieldName: 'display_name' })
  displayName!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'boolean', default: false, fieldName: 'is_system' })
  isSystem: boolean = false;

  @Property({ type: 'timestamptz', fieldName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date;
}

@Entity({ tableName: 'permissions', schema: 'public' })
export class Permission {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text' })
  category!: string;

  @Property({ type: 'timestamptz', fieldName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date;
}

@Entity({ tableName: 'role_permissions', schema: 'public' })
@Unique({ properties: ['role', 'permission'] })
export class RolePermission {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  role!: string;

  @ManyToOne(() => Permission, { fieldName: 'permission_id', deleteRule: 'cascade' })
  permission!: Permission;

  @Property({ type: 'timestamptz', fieldName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date;
}

@Entity({ tableName: 'user_permission_overrides', schema: 'public' })
@Unique({ properties: ['user', 'permission'] })
export class UserPermissionOverride {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @ManyToOne(() => Permission, { fieldName: 'permission_id', deleteRule: 'cascade' })
  permission!: Permission;

  @Property({ type: 'boolean' })
  granted!: boolean;

  @Property({ type: 'timestamptz', fieldName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date;
}
