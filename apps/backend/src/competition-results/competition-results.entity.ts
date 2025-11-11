import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';

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

  @Property({ type: 'text', fieldName: 'competition_class', serializedName: 'competition_class' })
  competitionClass!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  score!: number;

  @Property({ type: 'integer' })
  placement!: number;

  @Property({ type: 'integer', fieldName: 'points_earned', serializedName: 'points_earned', default: 0 })
  pointsEarned: number = 0;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_info', serializedName: 'vehicle_info' })
  vehicleInfo?: string;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'season_id', serializedName: 'season_id' })
  seasonId?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'class_id', serializedName: 'class_id' })
  classId?: string;

  @Property({ type: 'uuid', fieldName: 'created_by', serializedName: 'created_by' })
  createdBy!: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
