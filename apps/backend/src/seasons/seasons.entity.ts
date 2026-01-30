import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'seasons', schema: 'public' })
export class Season {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'integer' })
  year!: number;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'date', fieldName: 'start_date', serializedName: 'start_date' })
  startDate!: Date;

  @Property({ type: 'date', fieldName: 'end_date', serializedName: 'end_date' })
  endDate!: Date;

  @Property({ type: 'boolean', fieldName: 'is_current', serializedName: 'is_current' })
  isCurrent: boolean = false;

  @Property({ type: 'boolean', fieldName: 'is_next', serializedName: 'is_next' })
  isNext: boolean = false;

  @Property({ type: 'integer', nullable: true, fieldName: 'qualification_points_threshold', serializedName: 'qualification_points_threshold' })
  qualificationPointsThreshold?: number;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
