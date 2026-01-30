import { Entity, PrimaryKey, Property, ManyToOne, Enum, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { EventDirector } from './event-director.entity';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { EventAssignmentStatus, AssignmentRequestType } from '@newmeca/shared';

@Entity({ tableName: 'event_director_assignments', schema: 'public' })
@Unique({ properties: ['event', 'eventDirector'] })
export class EventDirectorAssignment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Event, { fieldName: 'event_id' })
  event!: Event;

  @ManyToOne(() => EventDirector, { fieldName: 'event_director_id' })
  eventDirector!: EventDirector;

  @Enum(() => EventAssignmentStatus)
  status: EventAssignmentStatus = EventAssignmentStatus.REQUESTED;

  @Enum(() => AssignmentRequestType)
  requestType!: AssignmentRequestType;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'requested_by' })
  requestedBy?: Profile;

  @Property({ type: 'timestamptz', fieldName: 'requested_at' })
  requestedAt: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'responded_at' })
  respondedAt?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'decline_reason' })
  declineReason?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'admin_notes' })
  adminNotes?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
