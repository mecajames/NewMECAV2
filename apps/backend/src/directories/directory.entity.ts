import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'directory_listings', schema: 'public' })
export class DirectoryListing {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => Profile, { fieldName: 'profile_id', unique: true })
  profile!: Profile;

  @Property({ type: 'text' })
  directoryType!: string;

  @Property({ type: 'text', nullable: true })
  businessName?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  logoUrl?: string;

  @Property({ type: 'text', nullable: true })
  bannerUrl?: string;

  @Property({ type: 'text', nullable: true })
  websiteUrl?: string;

  @Property({ type: 'text', nullable: true })
  phone?: string;

  @Property({ type: 'text', nullable: true })
  email?: string;

  @Property({ type: 'text', nullable: true })
  addressStreet?: string;

  @Property({ type: 'text', nullable: true })
  addressCity?: string;

  @Property({ type: 'text', nullable: true })
  addressState?: string;

  @Property({ type: 'text', nullable: true })
  addressZip?: string;

  @Property({ type: 'text', default: 'USA' })
  addressCountry: string = 'USA';

  @Property({ type: 'jsonb', default: '{}' })
  socialLinks: any = {};

  @Property({ type: 'jsonb', default: '{}' })
  businessHours: any = {};

  @Property({ type: 'boolean', default: false })
  featured: boolean = false;

  @Property({ type: 'integer', default: 0 })
  displayOrder: number = 0;

  @Property({ type: 'boolean', default: true })
  active: boolean = true;

  @Property({ type: 'jsonb', default: '{}' })
  metadata: any = {};

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
