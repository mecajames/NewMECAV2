import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { TicketDepartment as TicketDepartmentEntity } from './entities/ticket-department.entity';

@Entity({ tableName: 'tickets', schema: 'public' })
export class Ticket {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', fieldName: 'ticket_number', serializedName: 'ticket_number', unique: true })
  ticketNumber!: string;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  description!: string;

  @Enum(() => TicketCategory)
  category: TicketCategory = TicketCategory.GENERAL;

  // Legacy enum field (kept for backward compatibility during migration)
  @Property({ type: 'text', nullable: true })
  department?: string;

  // New department FK reference
  @ManyToOne(() => TicketDepartmentEntity, { nullable: true, fieldName: 'department_id', serializedName: 'department_id' })
  departmentEntity?: TicketDepartmentEntity;

  @Enum(() => TicketPriority)
  priority: TicketPriority = TicketPriority.MEDIUM;

  @Enum(() => TicketStatus)
  status: TicketStatus = TicketStatus.OPEN;

  // Reporter is nullable for guest tickets
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'reporter_id' })
  reporter?: Profile;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'assigned_to_id' })
  assignedTo?: Profile;

  @ManyToOne(() => Event, { nullable: true, fieldName: 'event_id' })
  event?: Event;

  // Guest ticket fields
  @Property({ type: 'text', nullable: true, fieldName: 'guest_email', serializedName: 'guest_email' })
  guestEmail?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'guest_name', serializedName: 'guest_name' })
  guestName?: string;

  @Property({ type: 'text', nullable: true, unique: true, fieldName: 'access_token', serializedName: 'access_token' })
  accessToken?: string;

  @Property({ type: 'boolean', default: false, fieldName: 'is_guest_ticket', serializedName: 'is_guest_ticket' })
  isGuestTicket: boolean = false;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'resolved_at', serializedName: 'resolved_at' })
  resolvedAt?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();

  toJSON() {
    const getProfileData = (profile?: Profile) => {
      if (!profile) return null;
      return {
        id: profile.id,
        email: profile.email || '',
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
      };
    };

    return {
      id: this.id,
      ticket_number: this.ticketNumber,
      title: this.title,
      description: this.description,
      category: this.category,
      department: this.department,
      department_id: this.departmentEntity?.id || null,
      priority: this.priority,
      status: this.status,
      reporter_id: this.reporter?.id || null,
      reporter: getProfileData(this.reporter),
      assigned_to_id: this.assignedTo?.id || null,
      assigned_to: getProfileData(this.assignedTo),
      event_id: this.event?.id || null,
      event: this.event ? { id: this.event.id, name: (this.event as any).title || (this.event as any).name } : null,
      guest_email: this.guestEmail || null,
      guest_name: this.guestName || null,
      access_token: this.accessToken || null,
      is_guest_ticket: this.isGuestTicket,
      resolved_at: this.resolvedAt?.toISOString() || null,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
