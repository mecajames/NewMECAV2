import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { MembershipType, PaymentStatus } from '../types/enums';
import { Profile } from '../profiles/entity';

@Entity({ tableName: 'memberships', schema: 'public' })
export class Membership {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

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

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
