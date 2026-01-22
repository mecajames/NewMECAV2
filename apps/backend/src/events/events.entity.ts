import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { EventStatus, EventType, MultiDayResultsMode } from '@newmeca/shared';
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

  @Property({ type: 'decimal', precision: 15, scale: 10, nullable: true })
  latitude?: number;

  @Property({ type: 'decimal', precision: 15, scale: 10, nullable: true })
  longitude?: number;

  @Property({ type: 'text', nullable: true, fieldName: 'flyer_url', serializedName: 'flyer_url' })
  flyerUrl?: string;

  // Flyer/cover image position for header display (x, y as percentages 0-100)
  @Property({ type: 'json', nullable: true, fieldName: 'flyer_image_position', serializedName: 'flyer_image_position' })
  flyerImagePosition?: { x: number; y: number };

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

  // Entry Fees (per class/format)
  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'member_entry_fee', serializedName: 'member_entry_fee' })
  memberEntryFee?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'non_member_entry_fee', serializedName: 'non_member_entry_fee' })
  nonMemberEntryFee?: number;

  // Gate Fee
  @Property({ type: 'boolean', nullable: true, default: false, fieldName: 'has_gate_fee', serializedName: 'has_gate_fee' })
  hasGateFee?: boolean;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'gate_fee', serializedName: 'gate_fee' })
  gateFee?: number;

  @Property({ type: 'integer', nullable: true, default: 2, fieldName: 'points_multiplier', serializedName: 'points_multiplier' })
  pointsMultiplier?: number;

  @Enum({ items: () => EventType, fieldName: 'event_type', serializedName: 'event_type' })
  eventType: EventType = EventType.STANDARD;

  @Property({ type: 'json', nullable: true, serializedName: 'formats' })
  formats?: string[];

  @Property({ type: 'uuid', nullable: true, fieldName: 'multi_day_group_id', serializedName: 'multi_day_group_id' })
  multiDayGroupId?: string;

  @Property({ type: 'integer', nullable: true, fieldName: 'day_number', serializedName: 'day_number' })
  dayNumber?: number;

  // Multi-day results mode: separate (default), combined_score, or combined_points
  @Enum({ items: () => MultiDayResultsMode, nullable: true, fieldName: 'multi_day_results_mode', serializedName: 'multi_day_results_mode' })
  multiDayResultsMode?: MultiDayResultsMode;

  @Property({ onCreate: () => new Date(), serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
