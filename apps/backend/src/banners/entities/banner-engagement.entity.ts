import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Banner } from './banner.entity';

@Entity({ tableName: 'banner_engagements', schema: 'public' })
@Index({ properties: ['banner', 'date'] })
export class BannerEngagement {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Banner, { fieldName: 'banner_id' })
  banner!: Banner;

  @Property({ type: 'date' })
  date!: Date;

  @Property({ type: 'integer', default: 0 })
  impressions: number = 0;

  @Property({ type: 'integer', default: 0 })
  clicks: number = 0;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
