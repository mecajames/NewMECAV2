import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'banner_images', schema: 'public' })
export class BannerImage {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => Profile, { fieldName: 'owner_id' })
  owner!: Profile;

  @Property({ type: 'text' })
  imageUrl!: string;

  @Property({ type: 'text' })
  bannerType!: string;

  @Property({ type: 'integer', default: 0 })
  position: number = 0;

  @Property({ type: 'text', nullable: true })
  linkUrl?: string;

  @Property({ type: 'text', nullable: true })
  altText?: string;

  @Property({ type: 'boolean', default: true })
  active: boolean = true;

  @Property({ type: 'timestamptz', nullable: true })
  displayStartDate?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  displayEndDate?: Date;

  @Property({ type: 'integer', default: 0 })
  impressions: number = 0;

  @Property({ type: 'integer', default: 0 })
  clicks: number = 0;

  @Property({ type: 'jsonb', default: '{}' })
  metadata: any = {};

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

@Entity({ tableName: 'manufacturer_ads', schema: 'public' })
export class ManufacturerAd {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => Profile, { fieldName: 'manufacturer_id' })
  manufacturer!: Profile;

  @Property({ type: 'integer' })
  adSlot!: number;

  @Property({ type: 'text' })
  adPlacement!: string;

  @Property({ type: 'text' })
  imageUrl!: string;

  @Property({ type: 'text', nullable: true })
  linkUrl?: string;

  @Property({ type: 'text', nullable: true })
  altText?: string;

  @Property({ type: 'boolean', default: true })
  active: boolean = true;

  @Property({ type: 'timestamptz', nullable: true })
  displayStartDate?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  displayEndDate?: Date;

  @Property({ type: 'integer', default: 0 })
  impressions: number = 0;

  @Property({ type: 'integer', default: 0 })
  clicks: number = 0;

  @Property({ type: 'jsonb', default: '{}' })
  metadata: any = {};

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
