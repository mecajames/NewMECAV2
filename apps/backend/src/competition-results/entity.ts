import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Event } from '../events/entity';
import { Profile } from '../profiles/entity';

@Entity({ tableName: 'competition_results', schema: 'public' })
export class CompetitionResult {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => Event, { fieldName: 'event_id' })
  event!: Event;

  @ManyToOne(() => Profile, { fieldName: 'competitor_id' })
  competitor!: Profile;

  @Property({ type: 'text', nullable: true })
  category?: string;

  @Property({ type: 'integer', nullable: true })
  placement?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'score_sound' })
  scoreSound?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'score_install' })
  scoreInstall?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'score_overall' })
  scoreOverall?: number;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'created_by' })
  createdBy?: Profile;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
