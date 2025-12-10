import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { MembershipType, PaymentStatus } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';

@Entity({ tableName: 'memberships', schema: 'public' })
export class Membership {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // User is optional - can be null for guest purchases
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'user_id' })
  user?: Profile;

  // Email for guest purchases (required if no user)
  @Property({ type: 'text', nullable: true })
  email?: string;

  // Reference to membership type configuration
  @ManyToOne(() => MembershipTypeConfig, { nullable: true, fieldName: 'membership_type_config_id' })
  membershipTypeConfig?: MembershipTypeConfig;

  @Enum(() => MembershipType)
  @Property({ fieldName: 'membership_type' })
  membershipType!: MembershipType;

  @Property({ type: 'timestamptz', fieldName: 'start_date' })
  startDate!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'end_date' })
  endDate?: Date;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'amount_paid' })
  amountPaid!: number;

  @Enum(() => PaymentStatus)
  @Property({ fieldName: 'payment_status' })
  paymentStatus: PaymentStatus = PaymentStatus.PENDING;

  @Property({ type: 'text', nullable: true, fieldName: 'transaction_id' })
  transactionId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_payment_intent_id' })
  stripePaymentIntentId?: string;

  // Guest billing information
  @Property({ type: 'text', nullable: true, fieldName: 'billing_first_name' })
  billingFirstName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_last_name' })
  billingLastName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_phone' })
  billingPhone?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_address' })
  billingAddress?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_city' })
  billingCity?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_state' })
  billingState?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_postal_code' })
  billingPostalCode?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_country' })
  billingCountry?: string;

  // Team/Business info (for team/retailer memberships)
  @Property({ type: 'text', nullable: true, fieldName: 'team_name' })
  teamName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'team_description' })
  teamDescription?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_name' })
  businessName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_website' })
  businessWebsite?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
