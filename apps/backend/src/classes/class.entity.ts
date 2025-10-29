import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { Season } from '../seasons/season.entity';
import { CompetitionFormat } from '../types/enums';

@Entity({ tableName: 'competition_classes' })
export class CompetitionClass {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  abbreviation!: string;

  @Enum(() => CompetitionFormat)
  @Property({ type: 'text' })
  format!: CompetitionFormat;

  @ManyToOne(() => Season, { fieldName: 'season_id' })
  season!: Season;

  @Property({ type: 'boolean', fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'int', fieldName: 'display_order' })
  displayOrder: number = 0;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
