import { Entity, PrimaryKey, Property, ManyToOne, OneToOne, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { JudgeApplication } from './judge-application.entity';
import { JudgeLevel, JudgeSpecialty, ApplicationEntryMethod } from '@newmeca/shared';
import { JudgeLevelHistory } from './judge-level-history.entity';
import { JudgeSeasonQualification } from './judge-season-qualification.entity';

@Entity({ tableName: 'judges', schema: 'public' })
export class Judge {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @OneToOne(() => Profile, { fieldName: 'user_id', unique: true })
  user!: Profile;

  @OneToOne(() => JudgeApplication, { nullable: true, fieldName: 'application_id' })
  application?: JudgeApplication;

  @Enum(() => JudgeLevel)
  level: JudgeLevel = JudgeLevel.IN_TRAINING;

  @Enum(() => JudgeSpecialty)
  specialty!: JudgeSpecialty;

  @Property({ type: 'json', fieldName: 'sub_specialties' })
  subSpecialties: string[] = [];

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

  @Property({ type: 'text', nullable: true, fieldName: 'travel_radius' })
  travelRadius?: string;

  @Property({ type: 'json', fieldName: 'additional_regions' })
  additionalRegions: string[] = [];

  @Property({ type: 'boolean', fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'approved_date' })
  approvedDate?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'approved_by' })
  approvedBy?: Profile;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'created_by' })
  createdBy?: Profile;

  @Enum(() => ApplicationEntryMethod)
  creationMethod: ApplicationEntryMethod = ApplicationEntryMethod.SELF;

  // Admin
  @Property({ type: 'text', nullable: true, fieldName: 'admin_notes' })
  adminNotes?: string;

  // Stats
  @Property({ type: 'integer', fieldName: 'total_events_judged' })
  totalEventsJudged: number = 0;

  @Property({ type: 'decimal', precision: 3, scale: 2, nullable: true, fieldName: 'average_rating' })
  averageRating?: number;

  @Property({ type: 'integer', fieldName: 'total_ratings' })
  totalRatings: number = 0;

  // Relationships
  @OneToMany(() => JudgeLevelHistory, history => history.judge)
  levelHistory = new Collection<JudgeLevelHistory>(this);

  @OneToMany(() => JudgeSeasonQualification, qual => qual.judge)
  seasonQualifications = new Collection<JudgeSeasonQualification>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
