import axios from '@/lib/axios';

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
    const response = await axios.get(`/api/event-registrations?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string): Promise<EventRegistration> => {
    const response = await axios.get(`/api/event-registrations/${id}`);
    return response.data;
  },

  create: async (data: Partial<EventRegistration>): Promise<EventRegistration> => {
    const response = await axios.post('/api/event-registrations', data);
    return response.data;
  },

  update: async (id: string, data: Partial<EventRegistration>): Promise<EventRegistration> => {
    const response = await axios.put(`/api/event-registrations/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/event-registrations/${id}`);
  },

  getStats: async (): Promise<{ totalRegistrations: number }> => {
    const response = await axios.get('/api/event-registrations/stats');
    return response.data;
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
    const response = await axios.get(`/api/event-registrations/pricing?${params}`);
    return response.data;
  },

  createPaymentIntent: async (data: CreateCheckoutData): Promise<PaymentIntentResponse> => {
    const response = await axios.post('/api/stripe/create-event-registration-payment-intent', data);
    return response.data;
  },

  getMyRegistrations: async (userId: string): Promise<EventRegistration[]> => {
    const response = await axios.get(`/api/event-registrations/my?userId=${userId}`);
    return response.data;
  },

  getCountByEvent: async (eventId: string): Promise<{ count: number }> => {
    const response = await axios.get(`/api/event-registrations/count/${eventId}`);
    return response.data;
  },

  getByEmail: async (email: string): Promise<EventRegistration[]> => {
    const response = await axios.get(`/api/event-registrations/by-email?email=${encodeURIComponent(email)}`);
    return response.data;
  },

  getQrCode: async (id: string): Promise<{ checkInCode: string; qrCodeData: string }> => {
    const response = await axios.get(`/api/event-registrations/${id}/qr-code`);
    return response.data;
  },

  // Check-in methods
  lookupByCheckInCode: async (code: string): Promise<CheckInResponse> => {
    const response = await axios.get(`/api/event-registrations/check-in/${code}`);
    return response.data;
  },

  checkIn: async (code: string, checkedInById: string): Promise<CheckInResponse> => {
    const response = await axios.post(`/api/event-registrations/check-in/${code}`, { checkedInById });
    return response.data;
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

    const response = await axios.get(`/api/event-registrations/admin/list?${params}`);
    return response.data;
  },

  adminCancel: async (id: string): Promise<EventRegistration> => {
    const response = await axios.post(`/api/event-registrations/admin/${id}/cancel`);
    return response.data;
  },

  adminRefund: async (id: string): Promise<EventRegistration> => {
    const response = await axios.post(`/api/event-registrations/admin/${id}/refund`);
    return response.data;
  },

  getEventCheckInStats: async (eventId: string): Promise<{ total: number; checkedIn: number; pending: number }> => {
    const response = await axios.get(`/api/event-registrations/admin/event/${eventId}/stats`);
    return response.data;
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    const response = await axios.get(`/api/event-registrations/admin/event/${eventId}/registrations`);
    return response.data;
  },

  linkToUser: async (email: string, userId: string): Promise<{ linked: number }> => {
    const response = await axios.post('/api/event-registrations/link-to-user', { email, userId });
    return response.data;
  },
};
