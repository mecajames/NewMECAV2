import axios from '@/lib/axios';

// =============================================================================
// Types
// =============================================================================

export type TicketStatus = 'open' | 'in_progress' | 'awaiting_response' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'general' | 'membership' | 'event_registration' | 'payment' | 'technical' | 'competition_results' | 'event_hosting' | 'account' | 'other';
export type TicketDepartment = 'general_support' | 'membership_services' | 'event_operations' | 'technical_support' | 'billing' | 'administration';

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  department: TicketDepartment;
  priority: TicketPriority;
  status: TicketStatus;
  reporter_id: string;
  assigned_to_id: string | null;
  event_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  reporter?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  assigned_to?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  event?: {
    id: string;
    name: string;
  } | null;
  comments_count?: number;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  comment_id: string | null;
  uploader_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  awaiting_response: number;
  resolved: number;
  closed: number;
  by_priority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_category: Record<string, number>;
  by_department: Record<string, number>;
  average_resolution_time_hours: number | null;
}

export interface TicketListQuery {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  department?: TicketDepartment;
  reporter_id?: string;
  assigned_to_id?: string;
  event_id?: string;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'priority' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedTickets {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateTicketData {
  title: string;
  description: string;
  category?: TicketCategory;
  department?: TicketDepartment;
  priority?: TicketPriority;
  reporter_id: string;
  event_id?: string | null;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  category?: TicketCategory;
  department?: TicketDepartment;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigned_to_id?: string | null;
  event_id?: string | null;
}

export interface CreateCommentData {
  author_id: string;
  content: string;
  is_internal?: boolean;
}

export interface CreateAttachmentData {
  uploader_id: string;
  comment_id?: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

// =============================================================================
// API Client
// =============================================================================

export const ticketsApi = {
  // -------------------------------------------------------------------------
  // Ticket Operations
  // -------------------------------------------------------------------------

  getAll: async (query: TicketListQuery = {}): Promise<PaginatedTickets> => {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.status) params.append('status', query.status);
    if (query.priority) params.append('priority', query.priority);
    if (query.category) params.append('category', query.category);
    if (query.department) params.append('department', query.department);
    if (query.reporter_id) params.append('reporter_id', query.reporter_id);
    if (query.assigned_to_id) params.append('assigned_to_id', query.assigned_to_id);
    if (query.event_id) params.append('event_id', query.event_id);
    if (query.search) params.append('search', query.search);
    if (query.sort_by) params.append('sort_by', query.sort_by);
    if (query.sort_order) params.append('sort_order', query.sort_order);

    const response = await axios.get(`/api/tickets?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Ticket> => {
    const response = await axios.get(`/api/tickets/${id}`);
    return response.data;
  },

  getByTicketNumber: async (ticketNumber: string): Promise<Ticket> => {
    const response = await axios.get(`/api/tickets/by-number/${ticketNumber}`);
    return response.data;
  },

  getMyTickets: async (userId: string): Promise<Ticket[]> => {
    const response = await axios.get(`/api/tickets/my-tickets/${userId}`);
    return response.data;
  },

  getAssignedTickets: async (userId: string): Promise<Ticket[]> => {
    const response = await axios.get(`/api/tickets/assigned/${userId}`);
    return response.data;
  },

  create: async (data: CreateTicketData): Promise<Ticket> => {
    const response = await axios.post('/api/tickets', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTicketData): Promise<Ticket> => {
    const response = await axios.put(`/api/tickets/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/tickets/${id}`);
  },

  // Ticket status actions
  assign: async (id: string, assignedToId: string): Promise<Ticket> => {
    const response = await axios.post(`/api/tickets/${id}/assign`, { assigned_to_id: assignedToId });
    return response.data;
  },

  resolve: async (id: string): Promise<Ticket> => {
    const response = await axios.post(`/api/tickets/${id}/resolve`);
    return response.data;
  },

  close: async (id: string): Promise<Ticket> => {
    const response = await axios.post(`/api/tickets/${id}/close`);
    return response.data;
  },

  reopen: async (id: string): Promise<Ticket> => {
    const response = await axios.post(`/api/tickets/${id}/reopen`);
    return response.data;
  },

  getStats: async (): Promise<TicketStats> => {
    const response = await axios.get('/api/tickets/stats');
    return response.data;
  },

  // -------------------------------------------------------------------------
  // Comment Operations
  // -------------------------------------------------------------------------

  getComments: async (ticketId: string, includeInternal: boolean = false): Promise<TicketComment[]> => {
    const params = includeInternal ? '?include_internal=true' : '';
    const response = await axios.get(`/api/tickets/${ticketId}/comments${params}`);
    return response.data;
  },

  createComment: async (ticketId: string, data: CreateCommentData): Promise<TicketComment> => {
    const response = await axios.post(`/api/tickets/${ticketId}/comments`, data);
    return response.data;
  },

  updateComment: async (commentId: string, data: { content?: string; is_internal?: boolean }): Promise<TicketComment> => {
    const response = await axios.put(`/api/tickets/comments/${commentId}`, data);
    return response.data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await axios.delete(`/api/tickets/comments/${commentId}`);
  },

  // -------------------------------------------------------------------------
  // Attachment Operations
  // -------------------------------------------------------------------------

  getAttachments: async (ticketId: string): Promise<TicketAttachment[]> => {
    const response = await axios.get(`/api/tickets/${ticketId}/attachments`);
    return response.data;
  },

  createAttachment: async (ticketId: string, data: CreateAttachmentData): Promise<TicketAttachment> => {
    const response = await axios.post(`/api/tickets/${ticketId}/attachments`, data);
    return response.data;
  },

  deleteAttachment: async (attachmentId: string): Promise<void> => {
    await axios.delete(`/api/tickets/attachments/${attachmentId}`);
  },
};
