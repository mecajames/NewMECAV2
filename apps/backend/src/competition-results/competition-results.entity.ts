import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'competition_results', schema: 'public' })
export class CompetitionResult {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'event_id', persist: false })
  eventId!: string;

  @ManyToOne(() => Event, { fieldName: 'event_id', hidden: true })
  event!: Event;

  @Property({ type: 'uuid', fieldName: 'competitor_id', nullable: true, persist: false })
  competitorId?: string;

  @ManyToOne(() => Profile, { fieldName: 'competitor_id', nullable: true, hidden: true })
  competitor?: Profile;

  @Property({ type: 'text', fieldName: 'competitor_name' })
  competitorName!: string;

  @Property({ type: 'text', fieldName: 'competition_class' })
  competitionClass!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  score!: number;

  @Property({ type: 'integer' })
  placement!: number;

  @Property({ type: 'integer', fieldName: 'points_earned' })
  pointsEarned!: number;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_info' })
  vehicleInfo?: string;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'season_id' })
  seasonId?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'class_id' })
  classId?: string;

  @Property({ type: 'uuid', fieldName: 'created_by' })
  createdBy!: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
