import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { EventStatus } from '../types/enums';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'events', schema: 'public' })
export class Event {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'timestamptz', fieldName: 'event_date' })
  eventDate!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'registration_deadline' })
  registrationDeadline?: Date;

  @Property({ type: 'text', fieldName: 'venue_name' })
  venueName!: string;

  @Property({ type: 'text', fieldName: 'venue_address' })
  venueAddress!: string;

  @Property({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Property({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @Property({ type: 'text', nullable: true, fieldName: 'flyer_url' })
  flyerUrl?: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'event_director_id' })
  eventDirector?: Profile;

  @Enum(() => EventStatus)
  status: EventStatus = EventStatus.UPCOMING;

  @Property({ type: 'integer', nullable: true, fieldName: 'max_participants' })
  maxParticipants?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'registration_fee' })
  registrationFee?: number;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
