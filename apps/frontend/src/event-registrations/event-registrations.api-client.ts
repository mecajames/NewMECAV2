const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// =============================================================================
// Types
// =============================================================================

export interface EventRegistration {
  id: string;
  event_id?: string;
  user_id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  registrationStatus: string;
  paymentStatus: string;
  amountPaid?: number;
  transactionId?: string;
  stripePaymentIntentId?: string;
  membershipPurchasedDuringRegistration?: boolean;
  mecaId?: number;
  checkInCode?: string;
  qrCodeData?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  notes?: string;
  registeredAt?: string;
  classes?: EventRegistrationClass[];
  event?: any;
  created_at?: string;
  updated_at?: string;
}

export interface EventRegistrationClass {
  id: string;
  competitionClassId: string;
  format: string;
  className: string;
  feeCharged: number;
  createdAt?: string;
}

export interface RegistrationPricing {
  perClassFee: number;
  classesSubtotal: number;
  membershipCost: number;
  total: number;
  savings: number;
  isMemberPricing: boolean;
}

export interface CheckInResponse {
  registration: {
    id: string;
    checkInCode: string;
    registeredAt?: string;
    amountPaid?: number;
    paymentStatus: string;
    checkedIn: boolean;
    checkedInAt?: string;
  };
  competitor: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    isMember: boolean;
    mecaId?: string;
  };
  event: {
    id: string;
    title: string;
    eventDate: string;
  };
  classes: Array<{
    format: string;
    className: string;
    feeCharged: number;
  }>;
  vehicle: {
    year?: string;
    make?: string;
    model?: string;
    info?: string;
  };
}

export interface AdminListResponse {
  registrations: EventRegistration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCheckoutData {
  eventId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  notes?: string;
  classes: Array<{
    competitionClassId: string;
    format: string;
    className: string;
  }>;
  includeMembership?: boolean;
  membershipTypeConfigId?: string;
  userId?: string;
  isMember: boolean;
  mecaId?: number;
  testMode?: boolean;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  registrationId: string;
}

// =============================================================================
// API Client
// =============================================================================

export const eventRegistrationsApi = {
  // Legacy methods
  getAll: async (page: number = 1, limit: number = 100): Promise<EventRegistration[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch event registrations');
    return response.json();
  },

  getById: async (id: string): Promise<EventRegistration> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`);
    if (!response.ok) throw new Error('Failed to fetch event registration');
    return response.json();
  },

  create: async (data: Partial<EventRegistration>): Promise<EventRegistration> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create event registration');
    return response.json();
  },

  update: async (id: string, data: Partial<EventRegistration>): Promise<EventRegistration> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update event registration');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete event registration');
  },

  getStats: async (): Promise<{ totalRegistrations: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/stats`);
    if (!response.ok) throw new Error('Failed to fetch registration stats');
    return response.json();
  },

  // New checkout methods
  calculatePricing: async (
    eventId: string,
    classCount: number,
    isMember: boolean,
    includeMembership: boolean = false,
    membershipPrice: number = 0,
  ): Promise<RegistrationPricing> => {
    const params = new URLSearchParams({
      eventId,
      classCount: String(classCount),
      isMember: String(isMember),
      includeMembership: String(includeMembership),
      membershipPrice: String(membershipPrice),
    });
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/pricing?${params}`);
    if (!response.ok) throw new Error('Failed to calculate pricing');
    return response.json();
  },

  createPaymentIntent: async (data: CreateCheckoutData): Promise<PaymentIntentResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/stripe/create-event-registration-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create payment intent' }));
      throw new Error(error.message || 'Failed to create payment intent');
    }
    return response.json();
  },

  getMyRegistrations: async (userId: string): Promise<EventRegistration[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/my?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch registrations');
    return response.json();
  },

  getCountByEvent: async (eventId: string): Promise<{ count: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/count/${eventId}`);
    if (!response.ok) throw new Error('Failed to fetch registration count');
    return response.json();
  },

  getByEmail: async (email: string): Promise<EventRegistration[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/by-email?email=${encodeURIComponent(email)}`);
    if (!response.ok) throw new Error('Failed to fetch registrations');
    return response.json();
  },

  getQrCode: async (id: string): Promise<{ checkInCode: string; qrCodeData: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/${id}/qr-code`);
    if (!response.ok) throw new Error('Failed to fetch QR code');
    return response.json();
  },

  // Check-in methods
  lookupByCheckInCode: async (code: string): Promise<CheckInResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/check-in/${code}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Registration not found' }));
      throw new Error(error.message || 'Registration not found');
    }
    return response.json();
  },

  checkIn: async (code: string, checkedInById: string): Promise<CheckInResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/check-in/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedInById }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to check in' }));
      throw new Error(error.message || 'Failed to check in');
    }
    return response.json();
  },

  // Admin methods
  adminList: async (filters: {
    eventId?: string;
    status?: string;
    paymentStatus?: string;
    checkedIn?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminListResponse> => {
    const params = new URLSearchParams();
    if (filters.eventId) params.append('eventId', filters.eventId);
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters.checkedIn !== undefined) params.append('checkedIn', String(filters.checkedIn));
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await fetch(`${API_BASE_URL}/api/event-registrations/admin/list?${params}`);
    if (!response.ok) throw new Error('Failed to fetch registrations');
    return response.json();
  },

  adminCancel: async (id: string): Promise<EventRegistration> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/admin/${id}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to cancel registration');
    return response.json();
  },

  adminRefund: async (id: string): Promise<EventRegistration> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/admin/${id}/refund`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to process refund');
    return response.json();
  },

  getEventCheckInStats: async (eventId: string): Promise<{ total: number; checkedIn: number; pending: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/admin/event/${eventId}/stats`);
    if (!response.ok) throw new Error('Failed to fetch check-in stats');
    return response.json();
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/admin/event/${eventId}/registrations`);
    if (!response.ok) throw new Error('Failed to fetch event registrations');
    return response.json();
  },

  linkToUser: async (email: string, userId: string): Promise<{ linked: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/event-registrations/link-to-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId }),
    });
    if (!response.ok) throw new Error('Failed to link registrations');
    return response.json();
  },
};
