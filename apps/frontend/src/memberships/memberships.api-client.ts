import axios from '@/lib/axios';

// MembershipType enum removed - use membershipTypeConfig instead
// Categories: competitor, team, retail, manufacturer

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export interface Membership {
  id: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
  membershipTypeConfig: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  // MECA ID (per-membership, or from profile if membership doesn't have one)
  mecaId?: number | string;
  // Subscription / Auto-Renewal fields
  stripeSubscriptionId?: string;
  hadLegacySubscription?: boolean;
  // Competitor info
  competitorName?: string;
  vehicleLicensePlate?: string;
  vehicleColor?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  // Team info
  hasTeamAddon?: boolean;
  teamName?: string;
  teamDescription?: string;
  teamNameLastEdited?: string;
  // Business info
  businessName?: string;
  businessPhone?: string;
  businessWebsite?: string;
  // Business address (structured, ISO standard)
  businessStreet?: string;
  businessCity?: string;
  businessState?: string; // ISO 3166-2
  businessPostalCode?: string;
  businessCountry?: string; // ISO 3166-1 alpha-2
  // Business directory listing
  businessDescription?: string;
  businessLogoUrl?: string;
  businessListingStatus?: 'pending_approval' | 'approved' | 'rejected';
  businessListingUpdatedAt?: string;
  // Billing info
  billingFirstName?: string;
  billingLastName?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  // Status
  startDate: string;
  endDate?: string;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipDto {
  userId: string;
  membershipTypeConfigId: string;
  amountPaid: number;
  stripePaymentIntentId?: string;
  transactionId?: string;
  // Competitor info
  competitorName?: string;
  vehicleLicensePlate?: string;
  vehicleColor?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  // Team info
  hasTeamAddon?: boolean;
  teamName?: string;
  teamDescription?: string;
  // Business info
  businessName?: string;
  businessPhone?: string;
  businessWebsite?: string;
  // Business address (structured, ISO standard)
  businessStreet?: string;
  businessCity?: string;
  businessState?: string; // ISO 3166-2
  businessPostalCode?: string;
  businessCountry?: string; // ISO 3166-1 alpha-2
  // Business directory listing
  businessDescription?: string;
  businessLogoUrl?: string;
  // Billing info
  billingFirstName?: string;
  billingLastName?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
}

export interface AdminAssignMembershipDto {
  userId: string;
  membershipTypeConfigId: string;
  durationMonths?: number;
  notes?: string;
}

/**
 * Payment methods available when admin creates a membership
 */
export enum AdminPaymentMethod {
  CASH = 'cash',
  CHECK = 'check',
  CREDIT_CARD_INVOICE = 'credit_card_invoice',
  COMPLIMENTARY = 'complimentary',
}

/**
 * DTO for admin creating a membership with full details
 */
export interface AdminCreateMembershipDto {
  // Required fields
  userId: string;
  membershipTypeConfigId: string;
  paymentMethod: AdminPaymentMethod;

  // Competitor-specific fields
  competitorName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;

  // Team add-on (for competitor memberships)
  hasTeamAddon?: boolean;
  teamName?: string;
  teamDescription?: string;

  // Business fields (for Retailer/Manufacturer)
  businessName?: string;
  businessWebsite?: string;
  manufacturerTier?: 'bronze' | 'silver' | 'gold';

  // Billing information
  billingFirstName?: string;
  billingLastName?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;

  // Payment details (for cash/check)
  cashReceiptNumber?: string;
  checkNumber?: string;
  createInvoice?: boolean;

  // Admin notes
  notes?: string;
  complimentaryReason?: string;
}

/**
 * Response from admin creating a membership
 */
export interface AdminCreateMembershipResult {
  membership: Membership;
  orderId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  message: string;
}

export interface CanPurchaseResult {
  canPurchase: boolean;
  reason?: string;
  existingMembershipId?: string;
}

export interface UserMecaId {
  mecaId: number;
  membershipId: string;
  category: string;
  competitorName: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

// =============================================================================
// Master/Secondary Membership Types
// =============================================================================

export enum MembershipAccountType {
  INDEPENDENT = 'independent',
  MASTER = 'master',
  SECONDARY = 'secondary',
}

export interface CreateSecondaryMembershipDto {
  membershipTypeConfigId: string;
  competitorName?: string; // Optional for 'self' relationship (uses master's name)
  relationshipToMaster: string; // 'self', 'spouse', 'child', 'sibling', 'friend'
  createLogin: boolean;
  email?: string;
  // Vehicle info - required for user-facing forms (validated in UI), optional for admin
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
  teamName?: string;
  teamDescription?: string;
}

export interface UpdateSecondaryDetailsDto {
  competitorName?: string;
  relationshipToMaster?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
}

// Relationship types for secondary memberships
// "Self" = same person, different vehicle (unique MECA ID per vehicle)
// Others = different person sharing master's billing
export const RELATIONSHIP_TYPES = [
  { value: 'self', label: 'Self (Another Vehicle)' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
] as const;

export interface SecondaryMembershipInfo {
  id: string;
  mecaId: number | string | null;
  competitorName: string;
  relationshipToMaster?: string;
  hasOwnLogin: boolean;
  profileId: string | null;
  membershipType: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  // Vehicle info
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
  linkedAt: string | null;
  startDate: string;
  endDate: string | null;
  paymentStatus: PaymentStatus;
  isActive: boolean;
}

export interface MasterMembershipInfo {
  id: string;
  mecaId: number | string | null;
  accountType: MembershipAccountType;
  secondaries: SecondaryMembershipInfo[];
  maxSecondaries: number;
  canAddMore: boolean;
}

export interface ControlledMecaId {
  mecaId: number | string;
  membershipId: string;
  profileId: string;
  competitorName: string;
  isOwn: boolean;
  relationshipToMaster?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
}

export interface TeamUpgradeDetails {
  eligible: boolean;
  reason?: string;
  originalPrice: number;
  proRatedPrice: number;
  daysRemaining: number;
  membershipId: string;
  membershipEndDate: string;
}

export interface CreateTeamUpgradePaymentIntentDto {
  membershipId: string;
  teamName: string;
  teamDescription?: string;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

export const membershipsApi = {
  /**
   * Get a membership by ID
   */
  getById: async (id: string): Promise<Membership> => {
    const response = await axios.get(`/api/memberships/${id}`);
    return response.data;
  },

  /**
   * Get active membership for a user
   */
  getUserActiveMembership: async (userId: string): Promise<Membership | null> => {
    try {
      const response = await axios.get(`/api/memberships/user/${userId}/active`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get all memberships for a user (including expired)
   */
  getAllByUserId: async (userId: string): Promise<Membership[]> => {
    const response = await axios.get(`/api/memberships/user/${userId}/all`);
    return response.data;
  },

  /**
   * Get all MECA IDs for a user across their memberships
   */
  getUserMecaIds: async (userId: string): Promise<UserMecaId[]> => {
    const response = await axios.get(`/api/memberships/user/${userId}/meca-ids`);
    return response.data;
  },

  /**
   * Check if a user can purchase a specific membership type
   */
  canPurchaseMembership: async (userId: string, membershipTypeConfigId: string): Promise<CanPurchaseResult> => {
    const response = await axios.get('/api/memberships/can-purchase', {
      params: { userId, membershipTypeConfigId },
    });
    return response.data;
  },

  /**
   * Create a new membership for a user
   * Requires user to be logged in - no more guest checkout
   */
  createMembership: async (data: CreateMembershipDto): Promise<Membership> => {
    const response = await axios.post('/api/memberships', data);
    return response.data;
  },

  /**
   * Admin: Get all memberships in the system
   */
  getAll: async (): Promise<Membership[]> => {
    const response = await axios.get('/api/memberships/admin/all');
    return response.data;
  },

  /**
   * Admin: Get lightweight memberships for the Members page.
   * Returns only the fields needed for display, cached on the server.
   */
  getMembersList: async (): Promise<any[]> => {
    const response = await axios.get('/api/memberships/admin/members-list');
    return response.data;
  },

  /**
   * Admin: Assign a membership to a user without payment (legacy - use adminCreate instead)
   */
  adminAssign: async (data: AdminAssignMembershipDto): Promise<Membership> => {
    const response = await axios.post('/api/memberships/admin/assign', data);
    return response.data;
  },

  /**
   * Admin: Create a membership with full details and payment options.
   * Supports Cash, Check, Credit Card (Invoice), and Complimentary payment methods.
   */
  adminCreate: async (data: AdminCreateMembershipDto): Promise<AdminCreateMembershipResult> => {
    const response = await axios.post('/api/memberships/admin/create', data);
    return response.data;
  },

  /**
   * Update team name for a membership (subject to 30-day edit window)
   */
  updateTeamName: async (id: string, teamName: string, isAdmin?: boolean): Promise<Membership> => {
    const response = await axios.put(`/api/memberships/${id}/team-name`, { teamName, isAdmin });
    return response.data;
  },

  /**
   * Update vehicle info for a membership
   */
  updateVehicleInfo: async (id: string, vehicleData: {
    vehicleLicensePlate?: string;
    vehicleColor?: string;
    vehicleMake?: string;
    vehicleModel?: string;
  }): Promise<Membership> => {
    const response = await axios.put(`/api/memberships/${id}/vehicle`, vehicleData);
    return response.data;
  },

  /**
   * Renew a user's membership
   */
  renewMembership: async (userId: string, membershipTypeConfigId: string): Promise<Membership> => {
    const response = await axios.post(`/api/memberships/user/${userId}/renew`, { membershipTypeConfigId });
    return response.data;
  },

  /**
   * Update a membership
   */
  update: async (id: string, data: Partial<Membership>): Promise<Membership> => {
    const response = await axios.put(`/api/memberships/${id}`, data);
    return response.data;
  },

  /**
   * Delete a membership
   */
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/memberships/${id}`);
  },

  /**
   * Admin: Get MECA ID history
   */
  getMecaIdHistory: async (limit?: number, offset?: number): Promise<{ items: any[]; total: number }> => {
    const response = await axios.get('/api/memberships/admin/meca-id-history', {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Admin: Get history for a specific MECA ID
   */
  getMecaIdHistoryById: async (mecaId: number): Promise<any[]> => {
    const response = await axios.get(`/api/memberships/admin/meca-id/${mecaId}/history`);
    return response.data;
  },

  // ========================
  // Team Upgrade Endpoints
  // ========================

  /**
   * Get team upgrade details and pro-rated pricing for a membership
   */
  getTeamUpgradeDetails: async (membershipId: string): Promise<TeamUpgradeDetails | null> => {
    try {
      const response = await axios.get(`/api/memberships/${membershipId}/team-upgrade`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create a Stripe payment intent for team upgrade
   */
  createTeamUpgradePaymentIntent: async (data: CreateTeamUpgradePaymentIntentDto): Promise<PaymentIntentResult> => {
    const response = await axios.post('/api/stripe/create-team-upgrade-payment-intent', data);
    return response.data;
  },

  /**
   * Apply team upgrade after payment (admin use or manual trigger)
   */
  applyTeamUpgrade: async (membershipId: string, teamName: string, teamDescription?: string): Promise<Membership> => {
    const response = await axios.post(`/api/memberships/${membershipId}/team-upgrade/apply`, {
      teamName,
      teamDescription,
    });
    return response.data;
  },

  // ========================
  // Master/Secondary Endpoints
  // ========================

  /**
   * Upgrade a membership to master status (allows adding secondaries)
   */
  upgradeToMaster: async (membershipId: string): Promise<Membership> => {
    const response = await axios.post(`/api/memberships/${membershipId}/upgrade-to-master`);
    return response.data;
  },

  /**
   * Create a secondary membership linked to a master
   */
  createSecondaryMembership: async (
    masterMembershipId: string,
    data: CreateSecondaryMembershipDto,
  ): Promise<Membership> => {
    const response = await axios.post(`/api/memberships/${masterMembershipId}/secondaries`, data);
    return response.data;
  },

  /**
   * Get all secondary memberships for a master
   */
  getSecondaryMemberships: async (masterMembershipId: string): Promise<SecondaryMembershipInfo[]> => {
    const response = await axios.get(`/api/memberships/${masterMembershipId}/secondaries`);
    return response.data;
  },

  /**
   * Get master membership info including all secondaries
   */
  getMasterMembershipInfo: async (membershipId: string): Promise<MasterMembershipInfo> => {
    const response = await axios.get(`/api/memberships/${membershipId}/master-info`);
    return response.data;
  },

  /**
   * Remove a secondary from master (upgrades secondary to independent)
   */
  removeSecondary: async (
    masterMembershipId: string,
    secondaryMembershipId: string,
    requestingUserId: string,
  ): Promise<Membership> => {
    const response = await axios.delete(
      `/api/memberships/${masterMembershipId}/secondaries/${secondaryMembershipId}`,
      { data: { requestingUserId } },
    );
    return response.data;
  },

  /**
   * Upgrade a secondary membership to independent status
   */
  upgradeToIndependent: async (secondaryMembershipId: string): Promise<Membership> => {
    const response = await axios.post(`/api/memberships/${secondaryMembershipId}/upgrade-to-independent`);
    return response.data;
  },

  /**
   * Mark a secondary membership as paid and assign MECA ID
   */
  markSecondaryPaid: async (
    secondaryMembershipId: string,
    amountPaid: number,
    transactionId?: string,
  ): Promise<Membership> => {
    const response = await axios.post(`/api/memberships/${secondaryMembershipId}/mark-secondary-paid`, {
      amountPaid,
      transactionId,
    });
    return response.data;
  },

  /**
   * Get all MECA IDs controlled by a user (their own + all secondaries)
   */
  getControlledMecaIds: async (userId: string): Promise<ControlledMecaId[]> => {
    const response = await axios.get(`/api/memberships/user/${userId}/controlled-meca-ids`);
    return response.data;
  },

  /**
   * Check if a user has access to a specific MECA ID
   */
  hasAccessToMecaId: async (userId: string, mecaId: number): Promise<boolean> => {
    const response = await axios.get(`/api/memberships/user/${userId}/has-access/${mecaId}`);
    return response.data.hasAccess;
  },

  /**
   * Check if a profile is a secondary account
   */
  isSecondaryProfile: async (profileId: string): Promise<boolean> => {
    const response = await axios.get(`/api/memberships/profile/${profileId}/is-secondary`);
    return response.data.isSecondary;
  },

  /**
   * Update a secondary membership's details (competitor name, relationship, vehicle info)
   * Can be called by the secondary owner or the master
   */
  updateSecondaryDetails: async (
    secondaryMembershipId: string,
    requestingUserId: string,
    data: UpdateSecondaryDetailsDto,
  ): Promise<Membership> => {
    const response = await axios.put(`/api/memberships/${secondaryMembershipId}/secondary-details`, {
      requestingUserId,
      ...data,
    });
    return response.data;
  },

  // ============================================================
  // SUPER ADMIN MECA ID OPERATIONS (requires special password)
  // ============================================================

  /**
   * Super Admin: Override MECA ID on an existing membership
   * Requires admin role + super admin password
   */
  superAdminOverrideMecaId: async (
    membershipId: string,
    newMecaId: number,
    superAdminPassword: string,
    reason: string,
  ): Promise<{ success: boolean; membership: Membership; message: string }> => {
    const response = await axios.put(`/api/memberships/${membershipId}/admin/override-meca-id`, {
      newMecaId,
      superAdminPassword,
      reason,
    });
    return response.data;
  },

  /**
   * Super Admin: Renew membership but keep old MECA ID (bypass 90-day rule)
   * Requires admin role + super admin password
   */
  superAdminRenewKeepMecaId: async (
    userId: string,
    membershipTypeConfigId: string,
    previousMecaId: number,
    superAdminPassword: string,
    reason: string,
  ): Promise<{ success: boolean; membership: Membership; message: string }> => {
    const response = await axios.post('/api/memberships/admin/renew-keep-meca-id', {
      userId,
      membershipTypeConfigId,
      previousMecaId,
      superAdminPassword,
      reason,
    });
    return response.data;
  },

  // ============================================================
  // ADMIN CANCELLATION OPERATIONS
  // ============================================================

  /**
   * Admin: Cancel a membership immediately.
   * Deactivates the membership immediately and sets status to CANCELLED.
   */
  adminCancelImmediately: async (
    membershipId: string,
    reason: string,
  ): Promise<{ success: boolean; membership: Membership; message: string }> => {
    const response = await axios.post(`/api/memberships/${membershipId}/admin/cancel-immediately`, {
      reason,
    });
    return response.data;
  },

  /**
   * Admin: Schedule a membership to be cancelled at the end of its current period.
   * The membership remains active until the end date.
   */
  adminCancelAtRenewal: async (
    membershipId: string,
    reason: string,
  ): Promise<{ success: boolean; membership: Membership; message: string }> => {
    const response = await axios.post(`/api/memberships/${membershipId}/admin/cancel-at-renewal`, {
      reason,
    });
    return response.data;
  },

  /**
   * Admin: Refund a membership.
   * Cancels immediately, processes Stripe refund, and sends notification email.
   */
  adminRefund: async (
    membershipId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    membership: Membership;
    stripeRefund: { id: string; amount: number; status: string } | null;
    message: string;
  }> => {
    const response = await axios.post(`/api/memberships/${membershipId}/admin/refund`, {
      reason,
    });
    return response.data;
  },

  /**
   * Admin: Get cancellation information for a membership
   */
  adminGetCancellationInfo: async (
    membershipId: string,
  ): Promise<{
    isCancelled: boolean;
    cancelAtPeriodEnd: boolean;
    cancelledAt?: string;
    cancellationReason?: string;
    cancelledBy?: string;
    effectiveEndDate?: string;
  }> => {
    const response = await axios.get(`/api/memberships/${membershipId}/admin/cancellation-info`);
    return response.data;
  },

  // ============================================================
  // MEMBER SELF-SERVICE CANCELLATION
  // ============================================================

  /**
   * Member: Request cancellation of their own membership.
   * This schedules cancellation at the end of the current period (NOT immediate).
   * Members who want immediate cancellation must contact support.
   */
  cancelMembership: async (
    membershipId: string,
    reason?: string,
  ): Promise<{
    success: boolean;
    message: string;
    effectiveEndDate: string;
  }> => {
    const response = await axios.post(`/api/memberships/${membershipId}/cancel`, {
      reason,
    });
    return response.data;
  },

  // ============================================================
  // SUBSCRIPTION / AUTO-RENEWAL MANAGEMENT
  // ============================================================

  /**
   * Get subscription status for a membership.
   * Returns current auto-renewal status and Stripe subscription details.
   */
  getSubscriptionStatus: async (
    membershipId: string,
  ): Promise<{
    autoRenewalStatus: 'on' | 'legacy' | 'off';
    stripeSubscriptionId: string | null;
    hadLegacySubscription: boolean;
    stripeSubscription: {
      status: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
    } | null;
  }> => {
    const response = await axios.get(`/api/memberships/${membershipId}/subscription-status`);
    return response.data;
  },

  /**
   * Admin: Cancel auto-renewal for a membership.
   * Can cancel immediately or at end of current period.
   */
  adminCancelAutoRenewal: async (
    membershipId: string,
    reason: string,
    cancelImmediately: boolean = false,
  ): Promise<{
    success: boolean;
    message: string;
    membership: Membership;
  }> => {
    const response = await axios.post(`/api/memberships/${membershipId}/admin/cancel-auto-renewal`, {
      reason,
      cancelImmediately,
    });
    return response.data;
  },

  /**
   * Admin: Enable auto-renewal for a membership.
   * Creates a new Stripe subscription if one doesn't exist.
   */
  adminEnableAutoRenewal: async (
    membershipId: string,
  ): Promise<{
    success: boolean;
    message: string;
    membership: Membership;
  }> => {
    const response = await axios.post(`/api/memberships/${membershipId}/admin/enable-auto-renewal`);
    return response.data;
  },

  /**
   * Member: Disable their own auto-renewal.
   * Cancels at end of current period (NOT immediate).
   */
  memberDisableAutoRenewal: async (
    membershipId: string,
    reason?: string,
  ): Promise<{
    success: boolean;
    message: string;
    effectiveCancellationDate: string;
  }> => {
    const response = await axios.post(`/api/memberships/${membershipId}/disable-auto-renewal`, {
      reason,
    });
    return response.data;
  },

  /**
   * Get Stripe Billing Portal URL for subscription management.
   * Members can use this to update payment methods, view invoices, etc.
   */
  getBillingPortalUrl: async (
    returnUrl: string,
  ): Promise<{
    url: string;
  }> => {
    const response = await axios.post('/api/memberships/billing-portal', {
      returnUrl,
    });
    return response.data;
  },
};
