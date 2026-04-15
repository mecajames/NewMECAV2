import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Coupon } from './coupon.entity';
import { Profile } from '../../profiles/profiles.entity';

@Entity({ tableName: 'coupon_usages', schema: 'public' })
export class CouponUsage {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Coupon, { fieldName: 'coupon_id' })
  coupon!: Coupon;

  @Property({ type: 'uuid', fieldName: 'coupon_id', serializedName: 'coupon_id', persist: false })
  couponId!: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id', hidden: true })
  user?: Profile;

  @Property({ type: 'uuid', nullable: true, fieldName: 'user_id', serializedName: 'user_id', persist: false })
  userId?: string;

  @Property({ type: 'varchar', length: 255, nullable: true, fieldName: 'guest_email', serializedName: 'guest_email' })
  guestEmail?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'order_id', serializedName: 'order_id' })
  orderId?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'shop_order_id', serializedName: 'shop_order_id' })
  shopOrderId?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'membership_id', serializedName: 'membership_id' })
  membershipId?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'discount_applied', serializedName: 'discount_applied' })
  discountApplied!: number;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_payment_intent_id', serializedName: 'stripe_payment_intent_id' })
  stripePaymentIntentId?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
