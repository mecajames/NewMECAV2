import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Judge } from './judge.entity';
import { Profile } from '../profiles/profiles.entity';
import { JudgeLevel } from '@newmeca/shared';

@Entity({ tableName: 'judge_level_history', schema: 'public' })
export class JudgeLevelHistory {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Judge, { fieldName: 'judge_id' })
  judge!: Judge;

  @Enum(() => JudgeLevel)
  previousLevel!: JudgeLevel;

  @Enum(() => JudgeLevel)
  newLevel!: JudgeLevel;

  @Property({ type: 'text', nullable: true })
  reason?: string;

  @ManyToOne(() => Profile, { fieldName: 'changed_by' })
  changedBy!: Profile;

  // Maps to the table's created_at (a history row is created AT the change).
  // The entity originally expected a changed_at column that no migration ever
  // added — on any DB matching the baseline the INSERT failed, so level
  // changes silently wrote no history. Found by the schema-drift health check.
  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  changedAt: Date = new Date();
}
