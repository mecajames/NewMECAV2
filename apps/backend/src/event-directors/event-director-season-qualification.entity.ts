import { Entity, PrimaryKey, Property, ManyToOne, Enum, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { EventDirector } from './event-director.entity';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';
import { SeasonQualificationStatus } from '@newmeca/shared';

@Entity({ tableName: 'event_director_season_qualifications', schema: 'public' })
@Unique({ properties: ['eventDirector', 'season'] })
export class EventDirectorSeasonQualification {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => EventDirector, { fieldName: 'event_director_id' })
  eventDirector!: EventDirector;

  @ManyToOne(() => Season, { fieldName: 'season_id' })
  season!: Season;

  @Enum(() => SeasonQualificationStatus)
  status: SeasonQualificationStatus = SeasonQualificationStatus.PENDING;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'qualified_date' })
  qualifiedDate?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'qualified_by' })
  qualifiedBy?: Profile;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
