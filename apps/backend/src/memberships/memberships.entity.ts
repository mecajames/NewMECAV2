import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { MembershipType, MembershipStatus, PaymentStatus } from '../types/enums';
import { Profile } from '../profiles/profiles.entity';

/**
 * Membership entity matching current database schema
 * Tracks individual membership purchases/renewals
 */
@Entity({ tableName: 'memberships', schema: 'public' })
export class Membership {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Enum(() => MembershipType)
  @Property({ fieldName: 'membership_type' })
  membershipType!: MembershipType;

  @Property({ type: 'timestamptz', fieldName: 'purchase_date' })
  purchaseDate!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'expiry_date' })
  expiryDate?: Date;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'amount_paid' })
  amountPaid!: number;

  @Property({ type: 'text', nullable: true, fieldName: 'payment_method' })
  paymentMethod?: string;

  @Enum(() => MembershipStatus)
  @Property({ fieldName: 'status' })
  status: MembershipStatus = MembershipStatus.ACTIVE;

  // Helper method to check if membership is expired
  isExpired(): boolean {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
  }

  // Helper method to get days until expiry
  daysUntilExpiry(): number | null {
    if (!this.expiryDate) return null;
    const now = new Date();
    const diff = this.expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
