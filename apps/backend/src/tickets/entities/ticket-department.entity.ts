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

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
