import axios from '@/lib/axios';

// ==================== ENUMS ====================

export enum EventHostingRequestStatus {
  PENDING = 'pending',
  ASSIGNED_TO_ED = 'assigned_to_ed',
  ED_REVIEWING = 'ed_reviewing',
  ED_ACCEPTED = 'ed_accepted',
  ED_REJECTED = 'ed_rejected',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  APPROVED_PENDING_INFO = 'approved_pending_info',
  PENDING_INFO = 'pending_info',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum EDAssignmentStatus {
  PENDING_REVIEW = 'pending_review',
  ACCEPTED = 'accepted',
  REJECTED_TO_ADMIN = 'rejected_to_admin',
}

export enum FinalApprovalStatus {
  APPROVED = 'approved',
  APPROVED_PENDING_INFO = 'approved_pending_info',
  REJECTED = 'rejected',
  PENDING_INFO = 'pending_info',
}

export enum EventTypeOption {
  ONE_X = '1x Event',
  TWO_X = '2x Event',
  THREE_X = '3x Event',
  FOUR_X = '4x Event',
  BRANDED = 'Branded Event',
  SPONSORED = 'Sponsored Event',
  OTHER = 'Other',
}

export type SenderRole = 'requestor' | 'event_director' | 'admin';
export type RecipientType = 'requestor' | 'event_director' | 'admin' | 'all';

// ==================== INTERFACES ====================

export enum HostType {
  BUSINESS = 'business',
  CLUB = 'club',
  INDIVIDUAL = 'individual',
}

export enum IndoorOutdoor {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  BOTH = 'both',
}

export interface EventHostingRequest {
  id: string;
  // Requester Information
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  business_name?: string;
  host_type?: HostType;
  user_id?: string;
  // Venue Information
  venue_name?: string;
  indoor_outdoor?: IndoorOutdoor;
  power_available?: boolean;
  // Event Information
  event_name: string;
  event_type: EventTypeOption;
  event_type_other?: string;
  event_description: string;
  // Event Dates
  event_start_date?: string;
  event_start_time?: string;
  event_end_date?: string;
  event_end_time?: string;
  // Competition Formats
  competition_formats?: string[];
  // Multi-Day Event Support
  is_multi_day?: boolean;
  day_2_date?: string;
  day_2_start_time?: string;
  day_2_end_time?: string;
  day_3_date?: string;
  day_3_start_time?: string;
  day_3_end_time?: string;
  // Location Information
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  // Venue Type
  venue_type?: string;
  expected_participants?: number;
  has_hosted_before?: boolean;
  // Additional Services
  additional_services?: string[];
  other_services_details?: string;
  other_requests?: string;
  additional_info?: string;
  // Budget and Registration
  estimated_budget?: string;
  has_registration_fee?: boolean;
  estimated_entry_fee?: string;
  pre_registration_available?: boolean;
  // Entry Fees (per class/format)
  member_entry_fee?: string;
  non_member_entry_fee?: string;
  // Gate Fee
  has_gate_fee?: boolean;
  gate_fee?: string;
  // Status
  status: EventHostingRequestStatus;
  // Admin Response (legacy)
  admin_response?: string;
  admin_response_date?: string;
  admin_responder_id?: string;
  // Event Director Assignment
  assigned_event_director_id?: string;
  assigned_at?: string;
  assignment_notes?: string;
  // ED Status
  ed_status?: EDAssignmentStatus;
  ed_response_date?: string;
  ed_rejection_reason?: string;
  // Final Status
  final_status?: FinalApprovalStatus;
  final_status_reason?: string;
  awaiting_requestor_response?: boolean;
  // Created Event Link
  created_event_id?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Populated relations
  user?: any;
  admin_responder?: any;
  assigned_event_director?: any;
  created_event?: any;
}

export interface EventHostingRequestMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_role: SenderRole;
  message: string;
  is_private: boolean;
  recipient_type?: RecipientType;
  created_at: string;
  updated_at: string;
  // Populated relations
  sender?: any;
}

export interface EventDirectorOption {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

export interface EventHostingRequestStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export interface EventDirectorStats {
  assigned: number;
  pendingReview: number;
  accepted: number;
}

// ==================== API CLIENT ====================

export const eventHostingRequestsApi = {
  // ==================== BASIC CRUD ====================

  getAll: async (
    page: number = 1,
    limit: number = 10,
    status?: EventHostingRequestStatus,
    search?: string
  ): Promise<{ data: EventHostingRequest[]; total: number }> => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const response = await axios.get(`/api/event-hosting-requests?${params}`);
    return response.data;
  },

  getById: async (id: string): Promise<EventHostingRequest> => {
    const response = await axios.get(`/api/event-hosting-requests/${id}`);
    return response.data;
  },

  getByUserId: async (userId: string): Promise<EventHostingRequest[]> => {
    const response = await axios.get(`/api/event-hosting-requests/user/${userId}`);
    return response.data;
  },

  create: async (data: Partial<EventHostingRequest>): Promise<EventHostingRequest> => {
    const response = await axios.post('/api/event-hosting-requests', data);
    return response.data;
  },

  update: async (id: string, data: Partial<EventHostingRequest>): Promise<EventHostingRequest> => {
    const response = await axios.put(`/api/event-hosting-requests/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/event-hosting-requests/${id}`);
  },

  getStats: async (): Promise<EventHostingRequestStats> => {
    const response = await axios.get('/api/event-hosting-requests/stats');
    return response.data;
  },

  // Legacy respond endpoint
  respond: async (
    id: string,
    responseText: string,
    status: EventHostingRequestStatus,
    adminId: string
  ): Promise<EventHostingRequest> => {
    const response = await axios.post(`/api/event-hosting-requests/${id}/respond`, {
      response: responseText,
      status,
      admin_id: adminId,
    });
    return response.data;
  },

  // ==================== EVENT DIRECTOR ASSIGNMENT ====================

  getAvailableEventDirectors: async (): Promise<EventDirectorOption[]> => {
    const response = await axios.get('/api/event-hosting-requests/available-event-directors');
    return response.data;
  },

  assignToEventDirector: async (
    requestId: string,
    eventDirectorId: string,
    adminId: string,
    notes?: string
  ): Promise<EventHostingRequest> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/assign`, {
      event_director_id: eventDirectorId,
      admin_id: adminId,
      notes,
    });
    return response.data;
  },

  reassignEventDirector: async (
    requestId: string,
    newEventDirectorId: string,
    adminId: string,
    notes?: string
  ): Promise<EventHostingRequest> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/reassign`, {
      new_event_director_id: newEventDirectorId,
      admin_id: adminId,
      notes,
    });
    return response.data;
  },

  revokeEDAssignment: async (
    requestId: string,
    adminId: string,
    reason?: string
  ): Promise<EventHostingRequest> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/revoke-assignment`, {
      admin_id: adminId,
      reason,
    });
    return response.data;
  },

  // ==================== EVENT DIRECTOR ACTIONS ====================

  getByEventDirector: async (
    eventDirectorId: string,
    status?: EventHostingRequestStatus
  ): Promise<EventHostingRequest[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const url = `/api/event-hosting-requests/event-director/${eventDirectorId}${params.toString() ? `?${params}` : ''}`;
    const response = await axios.get(url);
    return response.data;
  },

  getEventDirectorStats: async (eventDirectorId: string): Promise<EventDirectorStats> => {
    const response = await axios.get(`/api/event-hosting-requests/event-director/${eventDirectorId}/stats`);
    return response.data;
  },

  edAcceptAssignment: async (requestId: string, eventDirectorId: string): Promise<EventHostingRequest> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/ed-accept`, {
      event_director_id: eventDirectorId,
    });
    return response.data;
  },

  edRejectAssignment: async (
    requestId: string,
    eventDirectorId: string,
    reason: string
  ): Promise<EventHostingRequest> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/ed-reject`, {
      event_director_id: eventDirectorId,
      reason,
    });
    return response.data;
  },

  // ==================== MESSAGING ====================

  getMessages: async (
    requestId: string,
    viewerRole: 'requestor' | 'event_director' | 'admin' = 'requestor'
  ): Promise<EventHostingRequestMessage[]> => {
    const response = await axios.get(
      `/api/event-hosting-requests/${requestId}/messages?viewer_role=${viewerRole}`
    );
    return response.data;
  },

  addMessage: async (
    requestId: string,
    senderId: string,
    senderRole: SenderRole,
    message: string,
    isPrivate: boolean = false,
    recipientType?: RecipientType
  ): Promise<EventHostingRequestMessage> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/messages`, {
      sender_id: senderId,
      sender_role: senderRole,
      message,
      is_private: isPrivate,
      recipient_type: recipientType,
    });
    return response.data;
  },

  // ==================== FINAL APPROVAL ====================

  setFinalApproval: async (
    requestId: string,
    adminId: string,
    finalStatus: FinalApprovalStatus,
    reason?: string
  ): Promise<EventHostingRequest> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/final-approval`, {
      admin_id: adminId,
      final_status: finalStatus,
      reason,
    });
    return response.data;
  },

  // ==================== INFORMATION REQUESTS ====================

  requestFurtherInfo: async (
    requestId: string,
    senderId: string,
    senderRole: SenderRole,
    message: string
  ): Promise<EventHostingRequest> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/request-info`, {
      sender_id: senderId,
      sender_role: senderRole,
      message,
    });
    return response.data;
  },

  requestorRespond: async (
    requestId: string,
    requestorId: string,
    message: string
  ): Promise<EventHostingRequestMessage> => {
    const response = await axios.post(`/api/event-hosting-requests/${requestId}/requestor-respond`, {
      requestor_id: requestorId,
      message,
    });
    return response.data;
  },
};

// ==================== UTILITY FUNCTIONS ====================

export const getStatusLabel = (status: EventHostingRequestStatus): string => {
  const labels: Record<EventHostingRequestStatus, string> = {
    [EventHostingRequestStatus.PENDING]: 'Pending',
    [EventHostingRequestStatus.ASSIGNED_TO_ED]: 'Assigned to Event Director',
    [EventHostingRequestStatus.ED_REVIEWING]: 'ED Reviewing',
    [EventHostingRequestStatus.ED_ACCEPTED]: 'ED Accepted',
    [EventHostingRequestStatus.ED_REJECTED]: 'ED Rejected - Needs Reassignment',
    [EventHostingRequestStatus.UNDER_REVIEW]: 'Under Review',
    [EventHostingRequestStatus.APPROVED]: 'Approved',
    [EventHostingRequestStatus.APPROVED_PENDING_INFO]: 'Approved - Pending Info',
    [EventHostingRequestStatus.PENDING_INFO]: 'Pending Information',
    [EventHostingRequestStatus.REJECTED]: 'Rejected',
    [EventHostingRequestStatus.CANCELLED]: 'Cancelled',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: EventHostingRequestStatus): string => {
  const colors: Record<EventHostingRequestStatus, string> = {
    [EventHostingRequestStatus.PENDING]: 'yellow',
    [EventHostingRequestStatus.ASSIGNED_TO_ED]: 'blue',
    [EventHostingRequestStatus.ED_REVIEWING]: 'blue',
    [EventHostingRequestStatus.ED_ACCEPTED]: 'cyan',
    [EventHostingRequestStatus.ED_REJECTED]: 'orange',
    [EventHostingRequestStatus.UNDER_REVIEW]: 'blue',
    [EventHostingRequestStatus.APPROVED]: 'green',
    [EventHostingRequestStatus.APPROVED_PENDING_INFO]: 'lime',
    [EventHostingRequestStatus.PENDING_INFO]: 'purple',
    [EventHostingRequestStatus.REJECTED]: 'red',
    [EventHostingRequestStatus.CANCELLED]: 'gray',
  };
  return colors[status] || 'gray';
};

export const getFinalStatusLabel = (status: FinalApprovalStatus): string => {
  const labels: Record<FinalApprovalStatus, string> = {
    [FinalApprovalStatus.APPROVED]: 'Approved',
    [FinalApprovalStatus.APPROVED_PENDING_INFO]: 'Approved - Pending Info',
    [FinalApprovalStatus.REJECTED]: 'Rejected',
    [FinalApprovalStatus.PENDING_INFO]: 'Pending Information',
  };
  return labels[status] || status;
};

export const getEdStatusLabel = (status: EDAssignmentStatus): string => {
  const labels: Record<EDAssignmentStatus, string> = {
    [EDAssignmentStatus.PENDING_REVIEW]: 'Pending Review',
    [EDAssignmentStatus.ACCEPTED]: 'Accepted',
    [EDAssignmentStatus.REJECTED_TO_ADMIN]: 'Rejected to Admin',
  };
  return labels[status] || status;
};
