import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { EventStatus } from '../types/enums';
import { Profile } from '../profiles/profiles.entity';
import { Season } from '../seasons/seasons.entity';

@Entity({ tableName: 'events', schema: 'public' })
export class Event {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'timestamptz', fieldName: 'event_date', serializedName: 'event_date' })
  eventDate!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'registration_deadline', serializedName: 'registration_deadline' })
  registrationDeadline?: Date;

  @Property({ type: 'text', fieldName: 'venue_name', serializedName: 'venue_name' })
  venueName!: string;

  @Property({ type: 'text', fieldName: 'venue_address', serializedName: 'venue_address' })
  venueAddress!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'venue_city', serializedName: 'venue_city' })
  venueCity?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'venue_state', serializedName: 'venue_state' })
  venueState?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'venue_postal_code', serializedName: 'venue_postal_code' })
  venuePostalCode?: string;

  @Property({ type: 'text', nullable: true, default: 'US', fieldName: 'venue_country', serializedName: 'venue_country' })
  venueCountry?: string;

  @Property({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Property({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @Property({ type: 'text', nullable: true, fieldName: 'flyer_url', serializedName: 'flyer_url' })
  flyerUrl?: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'event_director_id', serializedName: 'event_director_id' })
  eventDirector?: Profile;

  @ManyToOne(() => Season, { nullable: true, fieldName: 'season_id', serializedName: 'season_id' })
  season?: Season;

  @Enum(() => EventStatus)
  status: EventStatus = EventStatus.UPCOMING;

  @Property({ type: 'integer', nullable: true, fieldName: 'max_participants', serializedName: 'max_participants' })
  maxParticipants?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'registration_fee', serializedName: 'registration_fee' })
  registrationFee?: number;

  @Property({ type: 'integer', nullable: true, default: 2, fieldName: 'points_multiplier', serializedName: 'points_multiplier' })
  pointsMultiplier?: number;

  @Property({ type: 'text[]', nullable: true, serializedName: 'formats' })
  formats?: string[];

  @Property({ onCreate: () => new Date(), serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
