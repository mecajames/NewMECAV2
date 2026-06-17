import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Ticket } from '../ticket.entity';
import { TicketCustomField } from './ticket-custom-field.entity';

/**
 * A submitter's answer to one custom field on one ticket. `value` is stored as
 * text; multiselect answers are JSON-encoded arrays, checkboxes 'true'/'false',
 * numbers/dates as their string form. EVENT_REFERENCE answers are NOT stored
 * here — they populate the ticket's event_id relation instead.
 */
@Entity({ tableName: 'ticket_custom_field_answers', schema: 'public' })
export class TicketCustomFieldAnswer {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // ON DELETE CASCADE is enforced at the DB level (see the migration FK rules),
  // so removing a ticket or field def cleans up its answers.
  @ManyToOne(() => Ticket, { fieldName: 'ticket_id' })
  ticket!: Ticket;

  @ManyToOne(() => TicketCustomField, { fieldName: 'field_id' })
  field!: TicketCustomField;

  @Property({ type: 'text', nullable: true })
  value?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
