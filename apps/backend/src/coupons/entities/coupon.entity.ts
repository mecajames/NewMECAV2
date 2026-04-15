import { Entity, PrimaryKey, Property, Enum, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { CouponDiscountType, CouponScope, CouponStatus } from '@newmeca/shared';
import { Profile } from '../../profiles/profiles.entity';
import { CouponUsage } from './coupon-usage.entity';

@Entity({ tableName: 'coupons', schema: 'public' })
export class Coupon {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum(() => CouponDiscountType)
  @Property({ fieldName: 'discount_type', serializedName: 'discount_type' })
  discountType!: CouponDiscountType;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'discount_value', serializedName: 'discount_value' })
  discountValue!: number;

  @Enum(() => CouponScope)
  @Property({ default: CouponScope.ALL })
  scope: CouponScope = CouponScope.ALL;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'applicable_product_ids', serializedName: 'applicable_product_ids' })
  applicableProductIds?: string[];

  @Property({ type: 'jsonb', nullable: true, fieldName: 'applicable_membership_type_config_ids', serializedName: 'applicable_membership_type_config_ids' })
  applicableMembershipTypeConfigIds?: string[];

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'min_order_amount', serializedName: 'min_order_amount' })
  minOrderAmount?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'max_discount_amount', serializedName: 'max_discount_amount' })
  maxDiscountAmount?: number;

  @Property({ type: 'integer', nullable: true, fieldName: 'max_uses', serializedName: 'max_uses' })
  maxUses?: number;

  @Property({ type: 'integer', default: 1, fieldName: 'max_uses_per_user', serializedName: 'max_uses_per_user' })
  maxUsesPerUser: number = 1;

  @Property({ type: 'boolean', default: false, fieldName: 'new_members_only', serializedName: 'new_members_only' })
  newMembersOnly: boolean = false;

  @Enum(() => CouponStatus)
  @Property({ default: CouponStatus.ACTIVE })
  status: CouponStatus = CouponStatus.ACTIVE;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'starts_at', serializedName: 'starts_at' })
  startsAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'expires_at', serializedName: 'expires_at' })
  expiresAt?: Date;

  @Property({ type: 'integer', default: 0, fieldName: 'times_used', serializedName: 'times_used' })
  timesUsed: number = 0;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'created_by', hidden: true })
  creator?: Profile;

  @Property({ type: 'uuid', nullable: true, fieldName: 'created_by', serializedName: 'created_by', persist: false })
  createdBy?: string;

  @OneToMany(() => CouponUsage, (usage) => usage.coupon)
  usages = new Collection<CouponUsage>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
