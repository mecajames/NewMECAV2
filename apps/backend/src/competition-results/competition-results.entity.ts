import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { Season } from '../seasons/seasons.entity';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';

@Entity({ tableName: 'competition_results', schema: 'public' })
export class CompetitionResult {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'event_id', serializedName: 'event_id', persist: false })
  eventId!: string;

  @ManyToOne(() => Event, { fieldName: 'event_id', nullable: true, hidden: true })
  event?: Event;

  @Property({ type: 'uuid', fieldName: 'competitor_id', serializedName: 'competitor_id', nullable: true, persist: false })
  competitorId?: string;

  @ManyToOne(() => Profile, { fieldName: 'competitor_id', nullable: true, hidden: true })
  competitor?: Profile;

  @Property({ type: 'text', fieldName: 'competitor_name', serializedName: 'competitor_name' })
  competitorName!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'meca_id', serializedName: 'meca_id' })
  mecaId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'state_code', serializedName: 'state_code' })
  stateCode?: string;

  @Property({ type: 'text', fieldName: 'competition_class', serializedName: 'competition_class' })
  competitionClass!: string;

  @Property({ type: 'text', nullable: true, serializedName: 'format' })
  format?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  score!: number;

  @Property({ type: 'integer' })
  placement!: number;

  @Property({ type: 'integer', fieldName: 'points_earned', serializedName: 'points_earned', default: 0 })
  pointsEarned: number = 0;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_info', serializedName: 'vehicle_info' })
  vehicleInfo?: string;

  @Property({ type: 'integer', nullable: true })
  wattage?: number;

  @Property({ type: 'integer', nullable: true })
  frequency?: number;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'season_id', serializedName: 'season_id', persist: false })
  seasonId?: string;

  @ManyToOne(() => Season, { fieldName: 'season_id', nullable: true, hidden: true })
  season?: Season;

  @Property({ type: 'uuid', nullable: true, fieldName: 'class_id', serializedName: 'class_id', persist: false })
  classId?: string;

  @ManyToOne(() => CompetitionClass, { fieldName: 'class_id', nullable: true, hidden: true })
  competitionClassEntity?: CompetitionClass;

  @Property({ type: 'uuid', fieldName: 'created_by', serializedName: 'created_by', persist: false })
  createdBy!: string;

  @ManyToOne(() => Profile, { fieldName: 'created_by', nullable: true, hidden: true })
  creator?: Profile;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'uuid', nullable: true, fieldName: 'updated_by', serializedName: 'updated_by', persist: false })
  updatedBy?: string;

  @ManyToOne(() => Profile, { fieldName: 'updated_by', nullable: true, hidden: true })
  updater?: Profile;

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at', nullable: true })
  updatedAt?: Date;

  @Property({ type: 'integer', default: 0, fieldName: 'revision_count', serializedName: 'revision_count' })
  revisionCount: number = 0;

  @Property({ type: 'text', nullable: true, fieldName: 'modification_reason', serializedName: 'modification_reason' })
  modificationReason?: string;
}
