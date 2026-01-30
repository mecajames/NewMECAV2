import { Entity, PrimaryKey, Property, ManyToOne, Enum, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Judge } from './judge.entity';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';
import { SeasonQualificationStatus } from '@newmeca/shared';

@Entity({ tableName: 'judge_season_qualifications', schema: 'public' })
@Unique({ properties: ['judge', 'season'] })
export class JudgeSeasonQualification {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Judge, { fieldName: 'judge_id' })
  judge!: Judge;

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
