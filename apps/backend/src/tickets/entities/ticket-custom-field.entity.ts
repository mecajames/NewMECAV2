import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

export interface TicketCustomFieldOption {
  value: string;
  label: string;
}

export interface TicketFieldShowWhen {
  field_id: string;
  operator: 'equals' | 'one_of' | 'is_checked' | 'not_empty';
  values: string[];
}

/**
 * Admin-defined custom field shown on the support ticket form based on the
 * selected category. A field can belong to several categories. EVENT_REFERENCE
 * fields are special — their answer maps onto the ticket's existing event_id
 * relation rather than the custom-answer table.
 */
@Entity({ tableName: 'ticket_custom_fields', schema: 'public' })
export class TicketCustomField {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true, fieldName: 'field_key' })
  fieldKey!: string;

  @Property({ type: 'text' })
  label!: string;

  @Property({ type: 'text', fieldName: 'field_type' })
  fieldType!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'help_text' })
  helpText?: string;

  @Property({ type: 'json', nullable: true })
  options?: TicketCustomFieldOption[];

  // Category keys (TicketCategory values) this field appears under.
  @Property({ type: 'json' })
  categories: string[] = [];

  @Property({ type: 'boolean', default: false })
  required: boolean = false;

  @Property({ type: 'boolean', default: true, fieldName: 'visible_to_user' })
  visibleToUser: boolean = true;

  // Optional field-to-field visibility condition.
  @Property({ type: 'json', nullable: true, fieldName: 'show_when' })
  showWhen?: TicketFieldShowWhen;

  @Property({ type: 'integer', default: 0, fieldName: 'display_order' })
  displayOrder: number = 0;

  @Property({ type: 'boolean', default: true, fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  // Explicit snake_case serialization (avoids the serializedName pitfalls seen
  // elsewhere in this module and gives the frontend a stable shape).
  toJSON() {
    return {
      id: this.id,
      field_key: this.fieldKey,
      label: this.label,
      field_type: this.fieldType,
      help_text: this.helpText ?? null,
      options: this.options ?? null,
      categories: this.categories ?? [],
      required: this.required,
      visible_to_user: this.visibleToUser,
      show_when: this.showWhen ?? null,
      display_order: this.displayOrder,
      is_active: this.isActive,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
