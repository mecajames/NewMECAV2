const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export enum MembershipType {
  DOMESTIC = 'domestic',
  INTERNATIONAL = 'international',
  TEAM = 'team',
  RETAILER = 'retailer',
  ANNUAL = 'annual',
  LIFETIME = 'lifetime',
}

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
  membershipTypeConfig?: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  membershipType: MembershipType;
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
  membershipType: MembershipType;
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
  membershipType: MembershipType;
  amountPaid: number;
  stripePaymentIntentId?: string;
  transactionId?: string;
}

export interface LinkMembershipsDto {
  email: string;
  userId: string;
}

export const membershipsApi = {
  /**
   * Get a membership by ID
   */
  getById: async (id: string): Promise<Membership> => {
    const response = await fetch(`${API_BASE_URL}/api/memberships/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch membership ${id}`);
    }
    return response.json();
  },

  /**
   * Get memberships by email (for guest lookup)
   */
  getByEmail: async (email: string): Promise<Membership[]> => {
    const response = await fetch(`${API_BASE_URL}/api/memberships/email/${encodeURIComponent(email)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch memberships by email');
    }
    return response.json();
  },

  /**
   * Get active membership for a user
   */
  getUserActiveMembership: async (userId: string): Promise<Membership | null> => {
    const response = await fetch(`${API_BASE_URL}/api/memberships/user/${userId}/active`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch active membership');
    }
    return response.json();
  },

  /**
   * Create a membership for a guest (no user account)
   * Used for guest checkout flow
   */
  createGuestMembership: async (data: CreateGuestMembershipDto): Promise<Membership> => {
    const response = await fetch(`${API_BASE_URL}/api/memberships/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create guest membership');
    }
    return response.json();
  },

  /**
   * Create a membership for an existing user
   */
  createUserMembership: async (data: CreateUserMembershipDto): Promise<Membership> => {
    const response = await fetch(`${API_BASE_URL}/api/memberships/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user membership');
    }
    return response.json();
  },

  /**
   * Link orphan memberships to a user after they create an account
   */
  linkMembershipsToUser: async (data: LinkMembershipsDto): Promise<Membership[]> => {
    const response = await fetch(`${API_BASE_URL}/api/memberships/link-to-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to link memberships to user');
    }
    return response.json();
  },

  /**
   * Renew a user's membership
   */
  renewMembership: async (userId: string, membershipType: MembershipType): Promise<Membership> => {
    const response = await fetch(`${API_BASE_URL}/api/memberships/user/${userId}/renew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ membershipType }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to renew membership');
    }
    return response.json();
  },
};
