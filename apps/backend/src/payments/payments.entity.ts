import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { PaymentStatus, PaymentMethod, PaymentType } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';

@Entity({ tableName: 'payments', schema: 'public' })
export class Payment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @ManyToOne(() => Membership, { nullable: true, fieldName: 'membership_id' })
  membership?: Membership;

  @Enum(() => PaymentType)
  @Property({ fieldName: 'payment_type' })
  paymentType!: PaymentType;

  @Enum(() => PaymentMethod)
  @Property({ fieldName: 'payment_method' })
  paymentMethod!: PaymentMethod;

  @Enum(() => PaymentStatus)
  @Property({ fieldName: 'payment_status' })
  paymentStatus: PaymentStatus = PaymentStatus.PENDING;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Property({ type: 'varchar', length: 3, nullable: true })
  currency?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'transaction_id' })
  transactionId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'external_payment_id' })
  externalPaymentId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_payment_intent_id' })
  stripePaymentIntentId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_customer_id' })
  stripeCustomerId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'wordpress_order_id' })
  wordpressOrderId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'wordpress_subscription_id' })
  wordpressSubscriptionId?: string;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'payment_metadata' })
  paymentMetadata?: Record<string, any>;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'paid_at' })
  paidAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'refunded_at' })
  refundedAt?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'refund_reason' })
  refundReason?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'failure_reason' })
  failureReason?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
