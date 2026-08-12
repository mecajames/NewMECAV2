import axios from '@/lib/axios';

// Member-facing shapes — the backend NEVER sends voter identities, member
// comments, or the interest threshold to these endpoints.
export type FeatureCategory = 'website' | 'events' | 'awards' | 'formats' | 'classes';

export const FEATURE_CATEGORIES: { id: FeatureCategory; label: string; emoji: string }[] = [
  { id: 'website', label: 'Website', emoji: '💻' },
  { id: 'events', label: 'Events', emoji: '📅' },
  { id: 'awards', label: 'Awards', emoji: '🏆' },
  { id: 'formats', label: 'Formats', emoji: '🔊' },
  { id: 'classes', label: 'Classes', emoji: '🏁' },
];

export interface FeatureRequestRow {
  id: string;
  title: string;
  description: string;
  status: 'needs_details' | 'gathering_interest' | 'investigating' | 'approved' | 'implemented' | 'declined' | 'expired';
  category: FeatureCategory;
  details_deadline_at?: string | null;
  revision_used?: boolean;
  planned_release?: string | null;
  admin_note_public?: string | null;
  upvotes: number;
  downvotes: number;
  avg_rating: number | null;
  score: number;
  voting_open: boolean;
  days_left: number;
  submitter_name: string;
  submitted_by_me: boolean;
  my_vote: { vote: 'up' | 'down'; rating: number | null } | null;
  messages?: FeatureThreadMessage[];
  created_at: string;
}

export interface FeatureThreadMessage {
  id: string;
  author_role: 'admin' | 'member';
  body: string;
  created_at: string;
}

export interface FeatureDashboardBrief {
  id: string;
  title: string;
  status: string;
  upvotes: number;
  downvotes: number;
  score: number;
  avg_rating: number | null;
  submitter_name: string;
  days_left: number;
}

export interface FeatureDashboardPayload {
  top3: FeatureDashboardBrief[];
  top5: FeatureDashboardBrief[];
  votableCount: number;
  leaderboard: {
    ideaMachine: { name: string; mecaId: string | null; count: number } | null;
    mostApproved: { name: string; mecaId: string | null; count: number } | null;
    shippedIt: { name: string; mecaId: string | null; count: number } | null;
  };
}

export const featureRequestsApi = {
  submit: async (data: { title: string; description: string; category: FeatureCategory }): Promise<FeatureRequestRow> => {
    const response = await axios.post('/api/feature-requests', data);
    return response.data;
  },

  /** One-time completion of a needs-details draft (ticket conversion). */
  completeDraft: async (id: string, data: { title: string; description: string; category: FeatureCategory }): Promise<FeatureRequestRow> => {
    const response = await axios.put(`/api/feature-requests/${id}/complete`, data);
    return response.data;
  },

  list: async (opts?: { status?: string; sort?: 'top' | 'newest' }): Promise<FeatureRequestRow[]> => {
    const response = await axios.get('/api/feature-requests', { params: opts });
    return response.data;
  },

  mine: async (): Promise<FeatureRequestRow[]> => {
    const response = await axios.get('/api/feature-requests/mine');
    return response.data;
  },

  dashboard: async (): Promise<FeatureDashboardPayload> => {
    const response = await axios.get('/api/feature-requests/dashboard');
    return response.data;
  },

  vote: async (
    id: string,
    data: { vote: 'up' | 'down'; rating?: number; comment?: string },
  ): Promise<{ vote: string; rating: number | null; upvotes: number; downvotes: number; avg_rating: number | null }> => {
    const response = await axios.put(`/api/feature-requests/${id}/vote`, data);
    return response.data;
  },

  reply: async (id: string, body: string): Promise<FeatureThreadMessage> => {
    const response = await axios.post(`/api/feature-requests/${id}/messages`, { body });
    return response.data;
  },

  resubmit: async (id: string, data: { title: string; description: string; category: FeatureCategory }): Promise<FeatureRequestRow> => {
    const response = await axios.post(`/api/feature-requests/${id}/resubmit`, data);
    return response.data;
  },

  // ---- Admin ----

  adminList: async (status?: string): Promise<any[]> => {
    const response = await axios.get('/api/feature-requests/admin/all', { params: { status } });
    return response.data;
  },

  adminSetStatus: async (
    id: string,
    data: { status: string; plannedRelease?: string | null; publicNote?: string | null; declinePublic?: boolean },
  ): Promise<any> => {
    const response = await axios.put(`/api/feature-requests/admin/${id}/status`, data);
    return response.data;
  },

  adminSetThreshold: async (id: string, thresholdPct: number): Promise<{ id: string; threshold_pct: number }> => {
    const response = await axios.put(`/api/feature-requests/admin/${id}/threshold`, { thresholdPct });
    return response.data;
  },

  adminMessage: async (id: string, memberUserId: string, body: string): Promise<FeatureThreadMessage> => {
    const response = await axios.post(`/api/feature-requests/admin/${id}/messages`, { memberUserId, body });
    return response.data;
  },

  /** Admin: convert a support ticket into a feature request (hard-closes the ticket). */
  adminConvertFromTicket: async (data: {
    ticketId: string;
    title: string;
    description: string;
    category: FeatureCategory;
    overrideCap?: boolean;
  }): Promise<{ id: string; status: string; needsDetails: boolean }> => {
    const response = await axios.post('/api/feature-requests/admin/convert-from-ticket', data);
    return response.data;
  },

  adminGetSettings: async (): Promise<{ detailsDeadlineDays: number }> => {
    const response = await axios.get('/api/feature-requests/admin/settings');
    return response.data;
  },

  adminUpdateSettings: async (detailsDeadlineDays: number): Promise<{ detailsDeadlineDays: number }> => {
    const response = await axios.put('/api/feature-requests/admin/settings', { detailsDeadlineDays });
    return response.data;
  },
};
