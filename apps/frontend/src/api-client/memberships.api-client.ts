import axios from 'axios';

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
  email?: string;
  membershipTypeConfig: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  startDate: string;
  endDate?: string;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  stripePaymentIntentId?: string;
  billingFirstName?: string;
  billingLastName?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  teamName?: string;
  teamDescription?: string;
  businessName?: string;
  businessWebsite?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuestMembershipDto {
  email: string;
  membershipTypeConfigId: string;
  amountPaid: number;
  stripePaymentIntentId?: string;
  transactionId?: string;
  billingFirstName: string;
  billingLastName: string;
  billingPhone?: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry?: string;
  teamName?: string;
  teamDescription?: string;
  businessName?: string;
  businessWebsite?: string;
}

export interface CreateUserMembershipDto {
  userId: string;
  membershipTypeConfigId: string;
  amountPaid: number;
  stripePaymentIntentId?: string;
  transactionId?: string;
}

export interface LinkMembershipsDto {
  email: string;
  userId: string;
}

export interface AdminAssignMembershipDto {
  userId: string;
  membershipTypeConfigId: string;
  durationMonths?: number;
  notes?: string;
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
   * Get memberships by email (for guest lookup)
   */
  getByEmail: async (email: string): Promise<Membership[]> => {
    const response = await axios.get(`/api/memberships/email/${encodeURIComponent(email)}`);
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
   * Admin: Get all memberships in the system
   */
  getAll: async (): Promise<Membership[]> => {
    const response = await axios.get('/api/memberships/admin/all');
    return response.data;
  },

  /**
   * Admin: Assign a membership to a user without payment
   */
  adminAssign: async (data: AdminAssignMembershipDto): Promise<Membership> => {
    const response = await axios.post('/api/memberships/admin/assign', data);
    return response.data;
  },

  /**
   * Create a membership for a guest (no user account)
   * Used for guest checkout flow
   */
  createGuestMembership: async (data: CreateGuestMembershipDto): Promise<Membership> => {
    const response = await axios.post('/api/memberships/guest', data);
    return response.data;
  },

  /**
   * Create a membership for an existing user
   */
  createUserMembership: async (data: CreateUserMembershipDto): Promise<Membership> => {
    const response = await axios.post('/api/memberships/user', data);
    return response.data;
  },

  /**
   * Link orphan memberships to a user after they create an account
   */
  linkMembershipsToUser: async (data: LinkMembershipsDto): Promise<Membership[]> => {
    const response = await axios.post('/api/memberships/link-to-user', data);
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
};
