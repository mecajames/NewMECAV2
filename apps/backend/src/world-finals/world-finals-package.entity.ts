import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'world_finals_packages', schema: 'public' })
export class WorldFinalsPackage {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'season_id', serializedName: 'season_id' })
  seasonId!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'base_price_early', serializedName: 'base_price_early' })
  basePriceEarly!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'base_price_regular', serializedName: 'base_price_regular' })
  basePriceRegular!: number;

  @Property({ type: 'integer', fieldName: 'included_classes', serializedName: 'included_classes' })
  includedClasses!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'additional_class_price_early', serializedName: 'additional_class_price_early' })
  additionalClassPriceEarly!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'additional_class_price_regular', serializedName: 'additional_class_price_regular' })
  additionalClassPriceRegular!: number;

  @Property({ type: 'integer', default: 0, fieldName: 'display_order', serializedName: 'display_order' })
  displayOrder: number = 0;

  @Property({ type: 'boolean', default: true, fieldName: 'is_active', serializedName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'timestamptz', fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', serializedName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
