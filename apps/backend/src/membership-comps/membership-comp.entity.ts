import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Enum,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Membership } from '../memberships/memberships.entity';
import { Profile } from '../profiles/profiles.entity';

/**
 * Comp benefit types. See Migration20260508000000_membership_comps for
 * full semantics.
 */
export enum MembershipCompType {
  FREE_PERIOD = 'free_period',
  FREE_SECONDARY_SLOTS = 'free_secondary_slots',
  RENEWAL_DISCOUNT_PCT = 'renewal_discount_pct',
  RENEWAL_DISCOUNT_FIXED = 'renewal_discount_fixed',
}

export enum MembershipCompStatus {
  ACTIVE = 'active',
  EXPIRED_UNUSED = 'expired_unused',
  CONSUMED = 'consumed',
  REVOKED = 'revoked',
}

@Entity({ tableName: 'membership_comps', schema: 'public' })
export class MembershipComp {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Membership, { fieldName: 'membership_id', serializedName: 'membership_id' })
  membership!: Membership;

  // @Enum carries fieldName + serializedName itself — stacking @Property on
  // top silently drops the serializedName, which causes the JSON to come
  // back as `compType` instead of `comp_type`. Single decorator with all
  // options keeps everything in sync.
  @Enum({
    items: () => MembershipCompType,
    fieldName: 'comp_type',
    serializedName: 'comp_type',
  })
  compType!: MembershipCompType;

  /**
   * Value semantics depend on comp_type:
   *   FREE_PERIOD          → months free
   *   FREE_SECONDARY_SLOTS → number of slots
   *   RENEWAL_DISCOUNT_PCT → percent (e.g., 25 = 25% off)
   *   RENEWAL_DISCOUNT_FIXED → dollars off
   */
  @Property({ type: 'decimal', precision: 10, scale: 2 })
  value!: string;

  @Property({ type: 'timestamptz', fieldName: 'starts_at', serializedName: 'starts_at' })
  startsAt: Date = new Date();

  /**
   * NULL means indefinite (until-revoked). For free_period this means the
   * member has a lifetime/comp-until-revoked benefit. For
   * free_secondary_slots NULL means slots can be claimed at any time.
   */
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'ends_at', serializedName: 'ends_at' })
  endsAt?: Date;

  /**
   * For discount/slot comps: how many times this comp can be applied.
   * NULL means unlimited (only really makes sense for free_secondary_slots
   * with ends_at set).
   */
  @Property({ type: 'integer', nullable: true, fieldName: 'max_uses', serializedName: 'max_uses' })
  maxUses?: number;

  @Property({ type: 'integer', nullable: true, fieldName: 'uses_remaining', serializedName: 'uses_remaining' })
  usesRemaining?: number;

  @Enum(() => MembershipCompStatus)
  @Property()
  status: MembershipCompStatus = MembershipCompStatus.ACTIVE;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'granted_by_admin_id', serializedName: 'granted_by_admin_id' })
  grantedByAdmin?: Profile;

  @Property({ type: 'timestamptz', fieldName: 'granted_at', serializedName: 'granted_at' })
  grantedAt: Date = new Date();

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'revoked_by_admin_id', serializedName: 'revoked_by_admin_id' })
  revokedByAdmin?: Profile;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'revoked_at', serializedName: 'revoked_at' })
  revokedAt?: Date;

  @Property({ type: 'text', nullable: true })
  reason?: string;

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'timestamptz', onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
