import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Season } from '../seasons/seasons.entity';

@Entity({ tableName: 'competition_classes', schema: 'public' })
export class CompetitionClass {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text' })
  abbreviation!: string;

  @Property({ type: 'text' })
  format!: string;

  @ManyToOne(() => Season, { fieldName: 'season_id', serializedName: 'season_id' })
  season!: Season;

  @Property({ type: 'uuid', fieldName: 'season_id', serializedName: 'season_id', persist: false })
  seasonId!: string;

  @Property({ type: 'boolean', fieldName: 'is_active', serializedName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'integer', fieldName: 'display_order', serializedName: 'display_order' })
  displayOrder: number = 0;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
