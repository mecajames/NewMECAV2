import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { Season } from '../seasons/seasons.entity';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';

@Entity({ tableName: 'spl_world_records', schema: 'public' })
export class SplWorldRecord {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'class_id', serializedName: 'class_id', persist: false })
  classId!: string;

  @ManyToOne(() => CompetitionClass, { fieldName: 'class_id', nullable: false, hidden: true })
  competitionClass!: CompetitionClass;

  @Property({ type: 'text', fieldName: 'class_name', serializedName: 'class_name' })
  className!: string;

  @Property({ type: 'uuid', fieldName: 'event_id', serializedName: 'event_id', nullable: true, persist: false })
  eventId?: string;

  @ManyToOne(() => Event, { fieldName: 'event_id', nullable: true, hidden: true })
  event?: Event;

  @Property({ type: 'text', fieldName: 'event_name', serializedName: 'event_name', nullable: true })
  eventName?: string;

  @Property({ type: 'uuid', fieldName: 'season_id', serializedName: 'season_id', nullable: true, persist: false })
  seasonId?: string;

  @ManyToOne(() => Season, { fieldName: 'season_id', nullable: true, hidden: true })
  season?: Season;

  @Property({ type: 'text', fieldName: 'competitor_name', serializedName: 'competitor_name' })
  competitorName!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'meca_id', serializedName: 'meca_id' })
  mecaId?: string;

  @Property({ type: 'uuid', fieldName: 'competitor_id', serializedName: 'competitor_id', nullable: true, persist: false })
  competitorId?: string;

  @ManyToOne(() => Profile, { fieldName: 'competitor_id', nullable: true, hidden: true })
  competitor?: Profile;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  score!: number;

  @Property({ type: 'integer', nullable: true })
  wattage?: number;

  @Property({ type: 'integer', nullable: true })
  frequency?: number;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'record_date', serializedName: 'record_date' })
  recordDate?: Date;

  @Property({ type: 'uuid', fieldName: 'created_by', serializedName: 'created_by', persist: false })
  createdBy!: string;

  @ManyToOne(() => Profile, { fieldName: 'created_by', nullable: true, hidden: true })
  creator?: Profile;

  @Property({ type: 'uuid', nullable: true, fieldName: 'updated_by', serializedName: 'updated_by', persist: false })
  updatedBy?: string;

  @ManyToOne(() => Profile, { fieldName: 'updated_by', nullable: true, hidden: true })
  updater?: Profile;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at', nullable: true })
  updatedAt?: Date;
}

@Entity({ tableName: 'spl_world_records_history', schema: 'public' })
export class SplWorldRecordHistory {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'record_id', serializedName: 'record_id', persist: false })
  recordId!: string;

  @ManyToOne(() => SplWorldRecord, { fieldName: 'record_id', nullable: false, hidden: true })
  record!: SplWorldRecord;

  @Property({ type: 'uuid', fieldName: 'class_id', serializedName: 'class_id', persist: false })
  classId!: string;

  @ManyToOne(() => CompetitionClass, { fieldName: 'class_id', nullable: false, hidden: true })
  competitionClass!: CompetitionClass;

  @Property({ type: 'text', fieldName: 'class_name', serializedName: 'class_name' })
  className!: string;

  @Property({ type: 'uuid', fieldName: 'event_id', serializedName: 'event_id', nullable: true, persist: false })
  eventId?: string;

  @ManyToOne(() => Event, { fieldName: 'event_id', nullable: true, hidden: true })
  event?: Event;

  @Property({ type: 'text', fieldName: 'event_name', serializedName: 'event_name', nullable: true })
  eventName?: string;

  @Property({ type: 'uuid', fieldName: 'season_id', serializedName: 'season_id', nullable: true, persist: false })
  seasonId?: string;

  @ManyToOne(() => Season, { fieldName: 'season_id', nullable: true, hidden: true })
  season?: Season;

  @Property({ type: 'text', fieldName: 'competitor_name', serializedName: 'competitor_name' })
  competitorName!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'meca_id', serializedName: 'meca_id' })
  mecaId?: string;

  @Property({ type: 'uuid', fieldName: 'competitor_id', serializedName: 'competitor_id', nullable: true, persist: false })
  competitorId?: string;

  @ManyToOne(() => Profile, { fieldName: 'competitor_id', nullable: true, hidden: true })
  competitor?: Profile;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  score!: number;

  @Property({ type: 'integer', nullable: true })
  wattage?: number;

  @Property({ type: 'integer', nullable: true })
  frequency?: number;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'record_date', serializedName: 'record_date' })
  recordDate?: Date;

  @Property({ type: 'uuid', fieldName: 'created_by', serializedName: 'created_by', persist: false })
  createdBy!: string;

  @ManyToOne(() => Profile, { fieldName: 'created_by', nullable: true, hidden: true })
  creator?: Profile;

  @Property({ type: 'uuid', nullable: true, fieldName: 'updated_by', serializedName: 'updated_by', persist: false })
  updatedBy?: string;

  @ManyToOne(() => Profile, { fieldName: 'updated_by', nullable: true, hidden: true })
  updater?: Profile;

  @Property({ type: 'timestamptz', fieldName: 'replaced_at', serializedName: 'replaced_at' })
  replacedAt: Date = new Date();

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt?: Date;
}
