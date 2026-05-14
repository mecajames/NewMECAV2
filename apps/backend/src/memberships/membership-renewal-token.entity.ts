import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from './memberships.entity';

@Entity({ tableName: 'membership_renewal_tokens', schema: 'public' })
@Index({ properties: ['user', 'expiresAt'] })
export class MembershipRenewalToken {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Membership, { fieldName: 'membership_id' })
  membership!: Membership;

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Property({ type: 'text', unique: true })
  token!: string;

  @Property({ type: 'timestamptz', fieldName: 'expires_at', serializedName: 'expires_at' })
  expiresAt!: Date;

  @Property({ type: 'timestamptz', fieldName: 'used_at', serializedName: 'used_at', nullable: true })
  usedAt?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
