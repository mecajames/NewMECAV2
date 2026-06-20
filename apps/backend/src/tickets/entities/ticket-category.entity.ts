import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

/**
 * Admin-managed, department-scoped ticket category. The submitter picks a
 * Department, then one of its categories. `key` is the stable identifier
 * stored in tickets.category and matched by routing rules + custom-field
 * bindings. (Class is *Entity to avoid clashing with the TicketCategory enum.)
 */
@Entity({ tableName: 'ticket_categories', schema: 'public' })
export class TicketCategoryEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true })
  key!: string;

  @Property({ type: 'text' })
  label!: string;

  // FK (by id) to ticket_departments. Plain scalar to keep serialization clean.
  @Property({ type: 'uuid', nullable: true, fieldName: 'department_id' })
  departmentId?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'integer', default: 0, fieldName: 'display_order' })
  displayOrder: number = 0;

  @Property({ type: 'boolean', default: true, fieldName: 'is_active' })
  isActive: boolean = true;

  // Form visibility: 'all' | 'members' | 'guests'. See ticket-audience.util.ts.
  @Property({ type: 'text', default: 'all' })
  audience: string = 'all';

  // When non-empty, only members holding one of these roles see this category.
  @Property({ type: 'json', nullable: true, fieldName: 'required_roles' })
  requiredRoles?: string[];

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  toJSON() {
    return {
      id: this.id,
      key: this.key,
      label: this.label,
      department_id: this.departmentId ?? null,
      description: this.description ?? null,
      display_order: this.displayOrder,
      is_active: this.isActive,
      audience: this.audience ?? 'all',
      required_roles: this.requiredRoles ?? null,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
