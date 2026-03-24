import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'world_finals_package_classes', schema: 'public' })
export class WorldFinalsPackageClass {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'package_id', serializedName: 'package_id' })
  packageId!: string;

  @Property({ type: 'text', fieldName: 'class_name', serializedName: 'class_name' })
  className!: string;

  @Property({ type: 'text', nullable: true })
  format?: string;

  @Property({ type: 'boolean', default: false, fieldName: 'is_premium', serializedName: 'is_premium' })
  isPremium: boolean = false;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'premium_price', serializedName: 'premium_price' })
  premiumPrice?: number;
}
