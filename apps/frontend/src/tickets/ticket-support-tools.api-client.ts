import axios from '@/lib/axios';

// ============================================================================
// Types
// ============================================================================

export interface StaffSignature {
  user_id: string;
  html: string;
  plain_text: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpsertSignatureDto {
  html?: string;
  plain_text?: string;
  is_active?: boolean;
}

/**
 * Per-ticket-filter saved by an agent. `criteria` is opaque to the
 * backend - the same shape that would be sent to GET /api/tickets.
 * `owner` is null for the caller's own filters; populated when the
 * row is a shared one from another agent.
 */
export interface SavedTicketFilter {
  id: string;
  user_id: string;
  name: string;
  criteria: Record<string, unknown>;
  is_default: boolean;
  is_shared_with_team: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
  owner: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface CreateSavedFilterDto {
  name: string;
  criteria: Record<string, unknown>;
  is_default?: boolean;
  is_shared_with_team?: boolean;
}

export interface UpdateSavedFilterDto {
  name?: string;
  criteria?: Record<string, unknown>;
  is_default?: boolean;
  is_shared_with_team?: boolean;
  sort_order?: number;
}

export interface CannedResponse {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string | null;
  is_shared: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
  owner: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface CreateCannedResponseDto {
  title: string;
  body: string;
  category?: string | null;
  is_shared?: boolean;
  sort_order?: number;
}

export interface UpdateCannedResponseDto {
  title?: string;
  body?: string;
  category?: string | null;
  is_shared?: boolean;
  sort_order?: number;
}

export interface TicketQuickLink {
  id: string;
  user_id: string | null;
  label: string;
  url: string;
  category: string | null;
  is_global: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
  owner: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface CreateQuickLinkDto {
  label: string;
  url: string;
  category?: string | null;
  is_global?: boolean;
  sort_order?: number;
}

export interface UpdateQuickLinkDto {
  label?: string;
  url?: string;
  category?: string | null;
  is_global?: boolean;
  sort_order?: number;
}

/**
 * Hardcoded standard filter returned by the backend. The criteria
 * may contain the placeholder string '$me' which resolves to the
 * current user's profile id client-side before being sent to the
 * ticket list endpoint.
 */
export interface SystemFilter {
  id: string;
  label: string;
  description: string;
  icon: string;
  criteria: Record<string, string>;
  sort_order: number;
}

// ============================================================================
// API
// ============================================================================

export const staffSignaturesApi = {
  getMine: async (): Promise<StaffSignature> => {
    const { data } = await axios.get<StaffSignature>('/api/ticket-tools/signatures/me');
    return data;
  },
  upsertMine: async (dto: UpsertSignatureDto): Promise<StaffSignature> => {
    const { data } = await axios.put<StaffSignature>('/api/ticket-tools/signatures/me', dto);
    return data;
  },
  deleteMine: async (): Promise<void> => {
    await axios.delete('/api/ticket-tools/signatures/me');
  },
};

export const savedTicketFiltersApi = {
  list: async (): Promise<SavedTicketFilter[]> => {
    const { data } = await axios.get<SavedTicketFilter[]>('/api/ticket-tools/saved-filters');
    return data;
  },
  create: async (dto: CreateSavedFilterDto): Promise<SavedTicketFilter> => {
    const { data } = await axios.post<SavedTicketFilter>('/api/ticket-tools/saved-filters', dto);
    return data;
  },
  update: async (id: string, dto: UpdateSavedFilterDto): Promise<SavedTicketFilter> => {
    const { data } = await axios.patch<SavedTicketFilter>(`/api/ticket-tools/saved-filters/${id}`, dto);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/ticket-tools/saved-filters/${id}`);
  },
};

export const cannedResponsesApi = {
  list: async (): Promise<CannedResponse[]> => {
    const { data } = await axios.get<CannedResponse[]>('/api/ticket-tools/canned-responses');
    return data;
  },
  create: async (dto: CreateCannedResponseDto): Promise<CannedResponse> => {
    const { data } = await axios.post<CannedResponse>('/api/ticket-tools/canned-responses', dto);
    return data;
  },
  update: async (id: string, dto: UpdateCannedResponseDto): Promise<CannedResponse> => {
    const { data } = await axios.patch<CannedResponse>(`/api/ticket-tools/canned-responses/${id}`, dto);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/ticket-tools/canned-responses/${id}`);
  },
};

export const systemFiltersApi = {
  list: async (): Promise<SystemFilter[]> => {
    const { data } = await axios.get<SystemFilter[]>('/api/ticket-tools/system-filters');
    return data;
  },
};

export const quickLinksApi = {
  list: async (): Promise<TicketQuickLink[]> => {
    const { data } = await axios.get<TicketQuickLink[]>('/api/ticket-tools/quick-links');
    return data;
  },
  create: async (dto: CreateQuickLinkDto): Promise<TicketQuickLink> => {
    const { data } = await axios.post<TicketQuickLink>('/api/ticket-tools/quick-links', dto);
    return data;
  },
  update: async (id: string, dto: UpdateQuickLinkDto): Promise<TicketQuickLink> => {
    const { data } = await axios.patch<TicketQuickLink>(`/api/ticket-tools/quick-links/${id}`, dto);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/ticket-tools/quick-links/${id}`);
  },
};

/**
 * Resolve {{variables}} in a canned-response body against a ticket
 * context. Kept on the frontend so admins can preview the raw
 * template in the editor and only see the resolved version when
 * actually inserting into a reply box.
 *
 * Unknown variables are left as-is so the agent notices and fills
 * them in manually rather than the substitution silently dropping
 * them.
 */
export function resolveCannedResponse(
  body: string,
  ctx: {
    customerName?: string | null;
    ticketId?: string | null;
    ticketNumber?: string | null;
    ticketSubject?: string | null;
    agentName?: string | null;
  },
): string {
  return body.replace(/\{\{\s*(customer_name|ticket_id|ticket_number|ticket_subject|agent_name)\s*\}\}/g, (_match, key: string) => {
    switch (key) {
      case 'customer_name': return ctx.customerName ?? '{{customer_name}}';
      case 'ticket_id': return ctx.ticketId ?? '{{ticket_id}}';
      case 'ticket_number': return ctx.ticketNumber ?? '{{ticket_number}}';
      case 'ticket_subject': return ctx.ticketSubject ?? '{{ticket_subject}}';
      case 'agent_name': return ctx.agentName ?? '{{agent_name}}';
      default: return `{{${key}}}`;
    }
  });
}

/**
 * Resolve `$me` placeholders in a system-filter criteria object so it
 * can be passed straight to the ticket-list endpoint. Pulled out of
 * the chip component so other surfaces (e.g. dashboard widgets) can
 * reuse the same canonical resolution.
 */
export function resolveSystemFilterCriteria(
  criteria: Record<string, string>,
  currentUserId: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(criteria)) {
    out[k] = v === '$me' ? currentUserId : v;
  }
  return out;
}
