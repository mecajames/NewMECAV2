import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'seasons', schema: 'public' })
export class Season {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'int' })
  year!: number;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'date', fieldName: 'start_date' })
  startDate!: Date;

  @Property({ type: 'date', fieldName: 'end_date' })
  endDate!: Date;

  @Property({ type: 'boolean', fieldName: 'is_current' })
  isCurrent: boolean = false;

  @Property({ type: 'boolean', fieldName: 'is_next' })
  isNext: boolean = false;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
