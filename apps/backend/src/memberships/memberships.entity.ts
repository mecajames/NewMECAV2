import { Entity, PrimaryKey, Property, Enum, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { PaymentStatus, MembershipAccountType } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';

@Entity({ tableName: 'memberships', schema: 'public' })
export class Membership {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // User is required - memberships must be tied to a user account
  @ManyToOne(() => Profile, { nullable: false, fieldName: 'user_id' })
  user!: Profile;

  // MECA ID assigned to this specific membership (unique per membership)
  // Starts at 700500, assigned when payment is completed
  @Property({ type: 'integer', nullable: true, unique: true, fieldName: 'meca_id' })
  mecaId?: number;

  // Name of the competitor (for family member registrations)
  // If null, uses the user's name
  @Property({ type: 'text', nullable: true, fieldName: 'competitor_name' })
  competitorName?: string;

  // Relationship to master account holder (spouse, child, sibling, parent, friend, other)
  // Used to identify/differentiate secondary memberships
  @Property({ type: 'text', nullable: true, fieldName: 'relationship_to_master' })
  relationshipToMaster?: string;

  // Vehicle information (required for competitor memberships)
  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_license_plate' })
  vehicleLicensePlate?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_color' })
  vehicleColor?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_make' })
  vehicleMake?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_model' })
  vehicleModel?: string;

  // Reference to membership type configuration (required)
  @ManyToOne(() => MembershipTypeConfig, { nullable: false, fieldName: 'membership_type_config_id' })
  membershipTypeConfig!: MembershipTypeConfig;

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

  // Team add-on flag (for competitor memberships)
  // When true, a team is automatically created for this membership
  @Property({ type: 'boolean', default: false, fieldName: 'has_team_addon' })
  hasTeamAddon: boolean = false;

  // Track when team name was last edited (for 30-day edit window)
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'team_name_last_edited' })
  teamNameLastEdited?: Date;

  // Team/Business info (for team/retailer/manufacturer memberships)
  @Property({ type: 'text', nullable: true, fieldName: 'team_name' })
  teamName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'team_description' })
  teamDescription?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_name' })
  businessName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_phone' })
  businessPhone?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_website' })
  businessWebsite?: string;

  // Business address (structured, ISO standard)
  @Property({ type: 'text', nullable: true, fieldName: 'business_street' })
  businessStreet?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_city' })
  businessCity?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_state' })
  businessState?: string; // ISO 3166-2 state/province code

  @Property({ type: 'text', nullable: true, fieldName: 'business_postal_code' })
  businessPostalCode?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_country', default: 'US' })
  businessCountry?: string = 'US'; // ISO 3166-1 alpha-2 country code

  // Business directory listing
  @Property({ type: 'text', nullable: true, fieldName: 'business_description' })
  businessDescription?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_logo_url' })
  businessLogoUrl?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'business_listing_status', default: 'pending_approval' })
  businessListingStatus?: string = 'pending_approval'; // pending_approval, approved, rejected

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'business_listing_updated_at' })
  businessListingUpdatedAt?: Date;

  // Billing information (kept for payment records)
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

  // =============================================================================
  // Master/Secondary Membership Hierarchy
  // =============================================================================

  // Account type: INDEPENDENT (default), MASTER (controls billing for secondaries), SECONDARY (linked to master)
  @Enum(() => MembershipAccountType)
  @Property({ fieldName: 'account_type', nullable: true, default: MembershipAccountType.INDEPENDENT })
  accountType?: MembershipAccountType = MembershipAccountType.INDEPENDENT;

  // For SECONDARY memberships: reference to the master membership
  @ManyToOne(() => Membership, { nullable: true, fieldName: 'master_membership_id' })
  masterMembership?: Membership;

  // For MASTER memberships: collection of linked secondary memberships
  @OneToMany(() => Membership, membership => membership.masterMembership)
  secondaryMemberships = new Collection<Membership>(this);

  // For SECONDARY memberships: whether the secondary has their own login/Profile
  // If true, a separate Profile exists for the secondary user
  // If false, the master user manages everything (secondary has no login)
  @Property({ type: 'boolean', nullable: true, default: false, fieldName: 'has_own_login' })
  hasOwnLogin?: boolean = false;

  // For SECONDARY memberships: the Profile responsible for billing (master's profile)
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'master_billing_profile_id' })
  masterBillingProfile?: Profile;

  // When this membership was linked as a secondary (null for INDEPENDENT/MASTER)
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'linked_at' })
  linkedAt?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  // =============================================================================
  // Subscription / Auto-Renewal Fields
  // =============================================================================

  // Stripe Subscription ID for active recurring billing
  @Property({ type: 'text', nullable: true, fieldName: 'stripe_subscription_id' })
  stripeSubscriptionId?: string;

  // True if this member had recurring billing enabled in the old PMPro system
  // Used to identify members who need to re-setup auto-renewal
  @Property({ type: 'boolean', default: false, fieldName: 'had_legacy_subscription' })
  hadLegacySubscription: boolean = false;

  // =============================================================================
  // Cancellation Fields
  // =============================================================================

  // If true, membership will be deactivated at end_date rather than immediately
  @Property({ type: 'boolean', default: false, fieldName: 'cancel_at_period_end' })
  cancelAtPeriodEnd: boolean = false;

  // Timestamp when the membership was cancelled
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'cancelled_at' })
  cancelledAt?: Date;

  // Reason provided for the cancellation
  @Property({ type: 'text', nullable: true, fieldName: 'cancellation_reason' })
  cancellationReason?: string;

  // User ID or identifier of who cancelled the membership (admin ID)
  @Property({ type: 'varchar', length: 50, nullable: true, fieldName: 'cancelled_by' })
  cancelledBy?: string;

  /**
   * Check if this membership's MECA ID can be reactivated (within 90-day window)
   */
  canReactivateMecaId(): boolean {
    if (!this.endDate) return false;
    const now = new Date();
    const daysSinceExpiry = (now.getTime() - this.endDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceExpiry <= 90;
  }

  /**
   * Get the auto-renewal status for display
   * Returns: 'on' | 'legacy' | 'off'
   */
  getAutoRenewalStatus(): 'on' | 'legacy' | 'off' {
    // Active Stripe subscription = auto-renewal is ON
    if (this.stripeSubscriptionId) {
      return 'on';
    }
    // Had recurring billing in old PMPro = Legacy (needs to re-setup)
    if (this.hadLegacySubscription) {
      return 'legacy';
    }
    // No subscription = OFF
    return 'off';
  }

  /**
   * Check if this membership has active auto-renewal via Stripe
   */
  hasActiveAutoRenewal(): boolean {
    return !!this.stripeSubscriptionId;
  }

  /**
   * Check if team name can still be edited.
   * Users can only edit their team name ONCE after purchase/renewal.
   * Once edited, they cannot edit again until next renewal.
   * Admins can always edit (handled in service layer).
   */
  canEditTeamName(): boolean {
    // If teamNameLastEdited is null, the user hasn't used their one edit yet
    // If it's set, they've already edited and must wait for renewal
    return !this.teamNameLastEdited;
  }

  /**
   * Get display name for this membership's competitor
   */
  getCompetitorDisplayName(): string {
    if (this.competitorName) {
      return this.competitorName;
    }
    if (this.user) {
      const firstName = this.user.first_name || '';
      const lastName = this.user.last_name || '';
      return `${firstName} ${lastName}`.trim() || 'Unknown';
    }
    return 'Unknown';
  }

  // =============================================================================
  // Master/Secondary Helper Methods
  // =============================================================================

  /**
   * Check if this membership is a master account
   */
  isMaster(): boolean {
    return this.accountType === MembershipAccountType.MASTER;
  }

  /**
   * Check if this membership is a secondary account
   */
  isSecondary(): boolean {
    return this.accountType === MembershipAccountType.SECONDARY;
  }

  /**
   * Check if this membership is independent (not linked to any master)
   */
  isIndependent(): boolean {
    return !this.accountType || this.accountType === MembershipAccountType.INDEPENDENT;
  }

  /**
   * Check if this membership can become a master (upgrade from independent)
   */
  canBecomeMaster(): boolean {
    return this.isIndependent() && this.paymentStatus === PaymentStatus.PAID;
  }

  /**
   * Check if this membership can be upgraded to independent (from secondary)
   */
  canBecomeIndependent(): boolean {
    return this.accountType === MembershipAccountType.SECONDARY;
  }

  /**
   * Get the billing profile for this membership
   * For secondaries, returns the master's billing profile
   * For others, returns the membership's user
   */
  getBillingProfile(): Profile | undefined {
    if (this.isSecondary() && this.masterBillingProfile) {
      return this.masterBillingProfile;
    }
    return this.user;
  }

  // =============================================================================
  // Cancellation Helper Methods
  // =============================================================================

  /**
   * Check if this membership has been cancelled (either immediately or scheduled)
   */
  isCancelled(): boolean {
    return !!this.cancelledAt;
  }

  /**
   * Check if this membership is scheduled for cancellation at period end
   */
  isScheduledForCancellation(): boolean {
    return this.cancelAtPeriodEnd && !this.isDeactivated();
  }

  /**
   * Check if this membership has been deactivated (cancelled and no longer active)
   */
  isDeactivated(): boolean {
    // Deactivated if: cancelled immediately (not at period end) OR
    // cancelled at period end and we're past the end date
    if (!this.cancelledAt) return false;

    if (!this.cancelAtPeriodEnd) {
      // Immediate cancellation
      return true;
    }

    // Scheduled cancellation - check if past end date
    if (this.endDate && new Date() >= this.endDate) {
      return true;
    }

    return false;
  }

  /**
   * Check if this membership is currently active
   * (paid, not expired, not deactivated)
   */
  isActive(): boolean {
    if (this.paymentStatus !== PaymentStatus.PAID) return false;
    if (this.isDeactivated()) return false;
    if (this.endDate && this.endDate < new Date()) return false;
    return true;
  }
}
