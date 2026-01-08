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

  @Property({ type: 'timestamptz', fieldName: 'changed_at' })
  changedAt: Date = new Date();
}
