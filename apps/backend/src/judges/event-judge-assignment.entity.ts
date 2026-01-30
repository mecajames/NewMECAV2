import { Entity, PrimaryKey, Property, ManyToOne, Enum, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Judge } from './judge.entity';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { EventAssignmentRole, EventAssignmentStatus, AssignmentRequestType } from '@newmeca/shared';

@Entity({ tableName: 'event_judge_assignments', schema: 'public' })
@Unique({ properties: ['event', 'judge'] })
export class EventJudgeAssignment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Event, { fieldName: 'event_id' })
  event!: Event;

  @ManyToOne(() => Judge, { fieldName: 'judge_id' })
  judge!: Judge;

  @Enum(() => EventAssignmentRole)
  role: EventAssignmentRole = EventAssignmentRole.SUPPORTING;

  @Enum(() => EventAssignmentStatus)
  status: EventAssignmentStatus = EventAssignmentStatus.REQUESTED;

  @Enum(() => AssignmentRequestType)
  requestType!: AssignmentRequestType;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'requested_by' })
  requestedBy?: Profile;

  @Property({ type: 'timestamptz', fieldName: 'request_date' })
  requestedAt: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'response_date' })
  respondedAt?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'notes' })
  notes?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
