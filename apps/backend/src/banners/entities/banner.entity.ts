import { Entity, PrimaryKey, Property, Enum, ManyToOne, OneToMany, Collection, Index } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { BannerPosition, BannerStatus } from '@newmeca/shared';
import { Advertiser } from './advertiser.entity';
import { BannerEngagement } from './banner-engagement.entity';

@Entity({ tableName: 'banners', schema: 'public' })
@Index({ properties: ['position', 'status', 'startDate', 'endDate'] })
export class Banner {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', fieldName: 'image_url' })
  imageUrl!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'click_url' })
  clickUrl?: string;

  @Enum(() => BannerPosition)
  @Property({ fieldName: 'position' })
  position!: BannerPosition;

  @Enum(() => BannerStatus)
  @Property({ fieldName: 'status' })
  status: BannerStatus = BannerStatus.DRAFT;

  @Property({ type: 'date', fieldName: 'start_date' })
  startDate!: Date;

  @Property({ type: 'date', fieldName: 'end_date' })
  endDate!: Date;

  @Property({ type: 'integer', default: 0 })
  priority: number = 0;

  @ManyToOne(() => Advertiser, { fieldName: 'advertiser_id' })
  advertiser!: Advertiser;

  @Property({ type: 'text', nullable: true, fieldName: 'alt_text' })
  altText?: string;

  // Frequency capping fields
  @Property({ type: 'integer', default: 0, fieldName: 'max_impressions_per_user' })
  maxImpressionsPerUser: number = 0; // 0 = unlimited

  @Property({ type: 'integer', default: 0, fieldName: 'max_total_impressions' })
  maxTotalImpressions: number = 0; // 0 = unlimited

  @Property({ type: 'integer', default: 100, fieldName: 'rotation_weight' })
  rotationWeight: number = 100; // Higher = more likely to be shown

  @OneToMany(() => BannerEngagement, engagement => engagement.banner)
  engagements = new Collection<BannerEngagement>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
