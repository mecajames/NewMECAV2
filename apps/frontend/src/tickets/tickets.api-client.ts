import axios from '@/lib/axios';

// =============================================================================
// Types
// =============================================================================

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'awaiting_response'
  | 'pending_internal_review'
  | 'escalated'
  | 'on_hold'
  | 'resolved'
  | 'reopened'
  | 'closed';
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
  // FK to the new TicketDepartment table. Backend serializes the relation's
  // id here; the legacy `department` enum above still carries the text
  // value for older callers.
  department_id: string | null;
  event_id: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  customer_rating: number | null;
  customer_feedback: string | null;
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
  // Decorated by the backend on list responses (not present on raw
  // single-ticket fetches). Surfaces the latest non-internal comment
  // author so the admin ticket list can show a "Last Reply" column
  // and the matching filter.
  last_reply?: {
    author_id: string | null;
    author_name: string;
    author_kind: 'staff' | 'customer' | 'system' | 'guest';
    created_at: string;
  } | null;
  // Derived "who has the ball" enum decorated by the backend on both
  // list and detail responses. 'customer' = staff replied last (or
  // status is awaiting_response); 'staff' = no reply yet, OR customer
  // replied last on a non-terminal ticket; 'nobody' = resolved /
  // closed / on_hold.
  waiting_on?: 'customer' | 'staff' | 'nobody';
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
  on_hold: number;
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
  // Status/priority/department/assigned_to_id accept either a single value
  // or an array (sent wire-side as comma-separated, parsed by the backend
  // into a `$in` clause). 'active' is still accepted as a synthetic status
  // group — backend expands it to every non-terminal status.
  // assigned_to_id also accepts the sentinel 'null' / 'unassigned' to
  // filter for tickets with no assignee.
  status?: TicketStatus | 'active' | string[];
  priority?: TicketPriority | TicketPriority[];
  category?: TicketCategory;
  department?: TicketDepartment | string[];
  reporter_id?: string;
  assigned_to_id?: string | string[];
  event_id?: string;
  search?: string;
  // 'staff' / 'customer' / 'none' — who posted the latest non-internal
  // comment on each ticket.
  last_reply_by?: 'staff' | 'customer' | 'none';
  // Derived "who has the ball" filter. See deriveWaitingOn on the
  // backend for the rule that maps status + last_reply -> this enum.
  waiting_on?: 'customer' | 'staff' | 'nobody';
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
  department_id?: string | null;
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
  // bucket + storage_path are forwarded straight from the upload response
  // so the backend proxy-download endpoint can resolve the file without
  // parsing the public URL.
  bucket?: string;
  storage_path?: string;
  file_size: number;
  mime_type: string;
}

/**
 * Admin-only enriched view of the reporter behind a ticket. Surfaces
 * everything the support admin needs to identify and act on the member
 * without bouncing between admin pages.
 */
export interface TicketReporterContext {
  profile: {
    id: string;
    meca_id: number | null;
    first_name: string | null;
    last_name: string | null;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    is_staff: boolean;
    account_type: string;
    can_apply_judge: boolean;
    can_apply_event_director: boolean;
    maintenance_login_allowed: boolean;
    login_banned: boolean;
  } | null;
  memberships: {
    id: string;
    type_name: string | null;
    category: string | null;
    payment_status: string;
    end_date: string | null;
    meca_id: number | null;
  }[];
  flags: {
    is_judge: boolean;
    is_event_director: boolean;
    is_retailer: boolean;
    is_manufacturer: boolean;
    teams: { team_id: string; team_name: string; role: string }[];
  } | null;
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
    // Multi-value filters: empty arrays drop the param entirely; arrays
    // with values are sent as repeated query params (?status=a&status=b)
    // so NestJS / Express produce a string[] without any CSV-vs-comma
    // ambiguity. Single strings pass through unchanged so single-value
    // callers (and the tab quick-filters) keep working.
    const appendMulti = (key: string, value: string | string[] | undefined) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== undefined && v !== null && v !== '') params.append(key, String(v));
        }
      } else if (value !== '') {
        params.append(key, value);
      }
    };
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    appendMulti('status', query.status as any);
    appendMulti('priority', query.priority as any);
    if (query.category) params.append('category', query.category);
    appendMulti('department', query.department as any);
    if (query.reporter_id) params.append('reporter_id', query.reporter_id);
    appendMulti('assigned_to_id', query.assigned_to_id);
    if (query.event_id) params.append('event_id', query.event_id);
    if (query.search) params.append('search', query.search);
    if (query.last_reply_by) params.append('last_reply_by', query.last_reply_by);
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

  hold: async (id: string): Promise<Ticket> => {
    const response = await axios.post(`/api/tickets/${id}/hold`);
    return response.data;
  },

  /**
   * Admin "Change Status" dropdown. Backend validates the transition against
   * TICKET_STATUS_TRANSITIONS and throws 400 with a readable message if the
   * requested status isn't reachable from the current one.
   */
  changeStatus: async (id: string, status: TicketStatus): Promise<Ticket> => {
    const response = await axios.patch(`/api/tickets/${id}/status`, { status });
    return response.data;
  },

  /**
   * Reporter-driven close from the member reply form. Rating + feedback
   * are optional; backend rejects rating values outside 1–5 and ignores a
   * blank feedback string.
   */
  closeByReporter: async (
    id: string,
    body: { rating?: number | null; feedback?: string | null } = {},
  ): Promise<Ticket> => {
    const response = await axios.post(`/api/tickets/${id}/close-by-reporter`, body);
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

  // -------------------------------------------------------------------------
  // Admin-only enrichment
  // -------------------------------------------------------------------------

  getReporterContext: async (ticketId: string): Promise<TicketReporterContext> => {
    const response = await axios.get(`/api/tickets/${ticketId}/reporter-context`);
    return response.data;
  },
};
