import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'membership_types', schema: 'public' })
export class MembershipType {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text', unique: true })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Property({ type: 'integer', default: 12 })
  durationMonths: number = 12;

  @Property({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Property({ type: 'boolean', default: false })
  canOwnTeam: boolean = false;

  @Property({ type: 'boolean', default: true })
  canJoinTeams: boolean = true;

  @Property({ type: 'boolean', default: false })
  listedInDirectory: boolean = false;

  @Property({ type: 'text', nullable: true })
  directoryType?: string;

  @Property({ type: 'boolean', default: false })
  hasBannerCarousel: boolean = false;

  @Property({ type: 'integer', default: 0 })
  bannerAdSlots: number = 0;

  @Property({ type: 'integer', nullable: true })
  maxTeamMembers?: number;

  @Property({ type: 'jsonb', default: '{}' })
  features: any = {};

  @Property({ type: 'jsonb', default: '{}' })
  metadata: any = {};

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
