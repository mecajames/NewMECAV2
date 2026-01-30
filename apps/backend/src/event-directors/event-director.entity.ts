import { Entity, PrimaryKey, Property, ManyToOne, OneToOne, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { EventDirectorApplication } from './event-director-application.entity';
import { ApplicationEntryMethod } from '@newmeca/shared';
import { EventDirectorSeasonQualification } from './event-director-season-qualification.entity';

@Entity({ tableName: 'event_directors', schema: 'public' })
export class EventDirector {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @OneToOne(() => Profile, { fieldName: 'user_id', unique: true })
  user!: Profile;

  @OneToOne(() => EventDirectorApplication, { nullable: true, fieldName: 'application_id' })
  application?: EventDirectorApplication;

  // Profile info
  @Property({ type: 'text', nullable: true, fieldName: 'headshot_url' })
  headshotUrl?: string;

  @Property({ type: 'text', nullable: true })
  bio?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'preferred_name' })
  preferredName?: string;

  // Location (matches database column names)
  @Property({ type: 'text', fieldName: 'location_country' })
  country!: string;

  @Property({ type: 'text', fieldName: 'location_state' })
  state!: string;

  @Property({ type: 'text', fieldName: 'location_city' })
  city!: string;

  // Specialization
  @Property({ type: 'json', fieldName: 'specialized_formats' })
  specializedFormats: string[] = [];

  @Property({ type: 'boolean', fieldName: 'is_active' })
  isActive: boolean = true;

  // Approval info
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'approved_date' })
  approvedDate?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'approved_by' })
  approvedBy?: Profile;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'created_by' })
  createdBy?: Profile;

  @Enum({ items: () => ApplicationEntryMethod, fieldName: 'creation_method' })
  creationMethod: ApplicationEntryMethod = ApplicationEntryMethod.SELF;

  // Stats
  @Property({ type: 'integer', fieldName: 'total_events_directed' })
  totalEventsDirected: number = 0;

  @Property({ type: 'decimal', precision: 3, scale: 2, fieldName: 'average_rating', nullable: true })
  averageRating?: number;

  @Property({ type: 'integer', fieldName: 'total_ratings' })
  totalRatings: number = 0;

  // Admin
  @Property({ type: 'text', nullable: true, fieldName: 'admin_notes' })
  adminNotes?: string;

  // Relationships
  @OneToMany(() => EventDirectorSeasonQualification, qual => qual.eventDirector)
  seasonQualifications = new Collection<EventDirectorSeasonQualification>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
