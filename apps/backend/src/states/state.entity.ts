import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'states', schema: 'public' })
export class State {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'integer', nullable: true, fieldName: 'v1_id', serializedName: 'v1_id' })
  v1Id?: number;

  @Property({ type: 'varchar' })
  name!: string;

  @Property({ type: 'varchar' })
  abbreviation!: string;

  @Property({ type: 'boolean', default: false, fieldName: 'is_international', serializedName: 'is_international' })
  isInternational: boolean = false;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date = new Date();
}
