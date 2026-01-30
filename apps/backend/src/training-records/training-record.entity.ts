import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { TrainingType, TraineeType, TrainingResult } from '@newmeca/shared';

@Entity({ tableName: 'training_records', schema: 'public' })
export class TrainingRecord {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Enum(() => TraineeType)
  trainee_type!: TraineeType;

  @Property({ type: 'uuid' })
  trainee_id!: string;

  @Enum(() => TrainingType)
  training_type!: TrainingType;

  @Property({ type: 'date' })
  training_date!: Date;

  @Enum(() => TrainingResult)
  result!: TrainingResult;

  @ManyToOne(() => Profile, { fieldName: 'trainer_id' })
  trainer!: Profile;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  created_at: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updated_at: Date = new Date();
}
