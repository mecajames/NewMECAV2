const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

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

    const response = await fetch(`${API_BASE_URL}/api/tickets?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
  },

  getById: async (id: string): Promise<Ticket> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${id}`);
    if (!response.ok) throw new Error('Failed to fetch ticket');
    return response.json();
  },

  getByTicketNumber: async (ticketNumber: string): Promise<Ticket> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/by-number/${ticketNumber}`);
    if (!response.ok) throw new Error('Failed to fetch ticket');
    return response.json();
  },

  getMyTickets: async (userId: string): Promise<Ticket[]> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/my-tickets/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch my tickets');
    return response.json();
  },

  getAssignedTickets: async (userId: string): Promise<Ticket[]> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/assigned/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch assigned tickets');
    return response.json();
  },

  create: async (data: CreateTicketData): Promise<Ticket> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create ticket');
    return response.json();
  },

  update: async (id: string, data: UpdateTicketData): Promise<Ticket> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update ticket');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete ticket');
  },

  // Ticket status actions
  assign: async (id: string, assignedToId: string): Promise<Ticket> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to_id: assignedToId }),
    });
    if (!response.ok) throw new Error('Failed to assign ticket');
    return response.json();
  },

  resolve: async (id: string): Promise<Ticket> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${id}/resolve`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to resolve ticket');
    return response.json();
  },

  close: async (id: string): Promise<Ticket> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${id}/close`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to close ticket');
    return response.json();
  },

  reopen: async (id: string): Promise<Ticket> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${id}/reopen`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to reopen ticket');
    return response.json();
  },

  getStats: async (): Promise<TicketStats> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/stats`);
    if (!response.ok) throw new Error('Failed to fetch ticket stats');
    return response.json();
  },

  // -------------------------------------------------------------------------
  // Comment Operations
  // -------------------------------------------------------------------------

  getComments: async (ticketId: string, includeInternal: boolean = false): Promise<TicketComment[]> => {
    const params = includeInternal ? '?include_internal=true' : '';
    const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/comments${params}`);
    if (!response.ok) throw new Error('Failed to fetch comments');
    return response.json();
  },

  createComment: async (ticketId: string, data: CreateCommentData): Promise<TicketComment> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create comment');
    return response.json();
  },

  updateComment: async (commentId: string, data: { content?: string; is_internal?: boolean }): Promise<TicketComment> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update comment');
    return response.json();
  },

  deleteComment: async (commentId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete comment');
  },

  // -------------------------------------------------------------------------
  // Attachment Operations
  // -------------------------------------------------------------------------

  getAttachments: async (ticketId: string): Promise<TicketAttachment[]> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/attachments`);
    if (!response.ok) throw new Error('Failed to fetch attachments');
    return response.json();
  },

  createAttachment: async (ticketId: string, data: CreateAttachmentData): Promise<TicketAttachment> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create attachment');
    return response.json();
  },

  deleteAttachment: async (attachmentId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/tickets/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete attachment');
  },
};
