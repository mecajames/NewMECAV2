import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Banner } from './banner.entity';

@Entity({ tableName: 'advertisers', schema: 'public' })
export class Advertiser {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', fieldName: 'company_name' })
  companyName!: string;

  @Property({ type: 'text', fieldName: 'contact_name' })
  contactName!: string;

  @Property({ type: 'text', fieldName: 'contact_email' })
  contactEmail!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'contact_phone' })
  contactPhone?: string;

  @Property({ type: 'text', nullable: true })
  website?: string;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'boolean', fieldName: 'is_active', default: true })
  isActive: boolean = true;

  @OneToMany(() => Banner, banner => banner.advertiser)
  banners = new Collection<Banner>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
