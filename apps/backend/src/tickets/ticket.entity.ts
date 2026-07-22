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

  // Stored as free text (the managed category KEY) so admin-defined,
  // department-scoped categories beyond the legacy enum are valid.
  @Property({ type: 'text' })
  category: string = TicketCategory.GENERAL;

  // Legacy enum field (kept for backward compatibility during migration)
  @Property({ type: 'text', nullable: true })
  department?: string;

  // New department FK reference
  @ManyToOne(() => TicketDepartmentEntity, { nullable: true, fieldName: 'department_id', serializedName: 'department_id' })
  departmentEntity?: TicketDepartmentEntity;

  @Enum(() => TicketPriority)
  priority: TicketPriority = TicketPriority.MEDIUM;

  // Declared as plain text (not @Enum) because the underlying column is
  // plain `text` in Postgres, and MikroORM's @Enum decorator has caused
  // surprising behavior with $in queries when an enum value isn't yet
  // present in any row (e.g. 'reopened' before the first reopen). The
  // TicketStatus TS enum is still used everywhere for ticket.status
  // assignment + comparison — they're just string literals at runtime.
  @Property({ type: 'text' })
  status: TicketStatus = TicketStatus.OPEN;

  // Reporter is nullable for guest tickets
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'reporter_id' })
  reporter?: Profile;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'assigned_to_id' })
  assignedTo?: Profile;

  // Assignee nag-email bookkeeping (TicketAssigneeReminderService). assignedAt
  // is when the CURRENT assignee got the ticket — re-stamped on reassignment,
  // cleared on unassignment. Count/remindedAt track the current nag cycle
  // (48h → 96h → every 8h) and reset when the ticket changes hands or the
  // customer adds a newer message than the last nag. Internal — not in toJSON.
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'assigned_at' })
  assignedAt?: Date;

  @Property({ type: 'integer', default: 0, fieldName: 'assignee_reminder_count' })
  assigneeReminderCount: number = 0;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'assignee_reminded_at' })
  assigneeRemindedAt?: Date;

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

  // Staff-only context pointer. When a guest ticket was actually submitted by
  // someone we recognise (e.g. an expired member routed through the guest flow,
  // who must NOT be linked as the reporter so they never gain dashboard access),
  // this holds their profile id purely so staff can pull up full account
  // context. Never exposed in the guest-facing ticket response.
  @Property({ type: 'uuid', nullable: true, fieldName: 'linked_profile_hint', serializedName: 'linked_profile_hint' })
  linkedProfileHint?: string;

  // Submitter network fingerprint captured at ticket creation. Staff-only —
  // intentionally NOT included in toJSON(); surfaced only via the admin
  // user-report endpoint.
  @Property({ type: 'text', nullable: true, fieldName: 'submitter_ip' })
  submitterIp?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'submitter_user_agent' })
  submitterUserAgent?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'resolved_at', serializedName: 'resolved_at' })
  resolvedAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'closed_at', serializedName: 'closed_at' })
  closedAt?: Date;

  // When the inactivity auto-close WARNING email was sent. While set, the ticket
  // is in its 24h grace window before TicketAutoCloseService closes it. Cleared
  // whenever a non-internal reply arrives (the inactivity clock restarts).
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'auto_close_warning_at', serializedName: 'auto_close_warning_at' })
  autoCloseWarningAt?: Date;

  // Staff-set per-reply countdown. If set and reached before the customer
  // replies, TicketAutoCloseService closes the ticket. Set when a staff reply
  // chooses "auto-close in N hours"; cleared on any non-internal reply.
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'auto_close_at', serializedName: 'auto_close_at' })
  autoCloseAt?: Date;

  // Reporter-only fields captured when the member closes their own ticket
  // via "Close & rate". Optional — admin-closed tickets leave these null.
  @Property({ type: 'smallint', nullable: true, fieldName: 'customer_rating', serializedName: 'customer_rating' })
  customerRating?: number;

  @Property({ type: 'text', nullable: true, fieldName: 'customer_feedback', serializedName: 'customer_feedback' })
  customerFeedback?: string;

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
      linked_profile_hint: this.linkedProfileHint || null,
      resolved_at: this.resolvedAt?.toISOString() || null,
      closed_at: this.closedAt?.toISOString() || null,
      auto_close_warning_at: this.autoCloseWarningAt?.toISOString() || null,
      auto_close_at: this.autoCloseAt?.toISOString() || null,
      customer_rating: this.customerRating ?? null,
      customer_feedback: this.customerFeedback ?? null,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
