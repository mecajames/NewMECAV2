import { Entity, PrimaryKey, Property, Collection, OneToMany } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'ticket_departments', schema: 'public' })
export class TicketDepartment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Property({ type: 'varchar', length: 50, unique: true })
  slug!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'boolean', fieldName: 'is_active', serializedName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ type: 'boolean', fieldName: 'is_private', serializedName: 'is_private', default: false })
  isPrivate: boolean = false;

  @Property({ type: 'boolean', fieldName: 'is_default', serializedName: 'is_default', default: false })
  isDefault: boolean = false;

  @Property({ type: 'integer', fieldName: 'display_order', serializedName: 'display_order', default: 0 })
  displayOrder: number = 0;

  // Form visibility: 'all' (guests + members), 'members' (logged-in only),
  // 'guests' (not-logged-in only). See ticket-audience.util.ts.
  @Property({ type: 'varchar', length: 20, fieldName: 'audience', serializedName: 'audience', default: 'all' })
  audience: string = 'all';

  // When non-empty, only members whose role is in this list see this department
  // (implies members-only). Used for Event Director / Judge departments.
  @Property({ type: 'json', fieldName: 'required_roles', serializedName: 'required_roles', nullable: true })
  requiredRoles?: string[];

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
