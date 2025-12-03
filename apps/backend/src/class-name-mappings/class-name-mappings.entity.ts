import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { CompetitionClass } from '../competition-classes/competition-classes.entity';

@Entity({ tableName: 'class_name_mappings', schema: 'public' })
export class ClassNameMapping {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', fieldName: 'source_name' })
  sourceName!: string;

  @Property({ type: 'uuid', fieldName: 'target_class_id', nullable: true })
  targetClassId?: string;

  @ManyToOne(() => CompetitionClass, { fieldName: 'target_class_id', nullable: true, persist: false })
  targetClass?: CompetitionClass;

  @Property({ type: 'text', fieldName: 'source_system', default: 'termlab' })
  sourceSystem: string = 'termlab';

  @Property({ type: 'boolean', fieldName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'timestamptz', fieldName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
