import axios from '@/lib/axios';

const API_BASE = '/api/world-finals';

export interface WorldFinalsQualification {
  id: string;
  season_id: string;
  meca_id: number;
  competitor_name: string;
  competition_class: string;
  user_id?: string;
  total_points: number;
  qualified_at: string;
  notification_sent: boolean;
  notification_sent_at?: string;
  email_sent: boolean;
  email_sent_at?: string;
  invitation_sent: boolean;
  invitation_sent_at?: string;
  invitation_token?: string;
  invitation_redeemed: boolean;
  invitation_redeemed_at?: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  season?: {
    id: string;
    name: string;
    year: number;
    qualification_points_threshold?: number;
  };
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface QualificationStats {
  totalQualifications: number;
  uniqueCompetitors: number;
  classesByQualifications: { className: string; count: number }[];
  notificationsSent: number;
  emailsSent: number;
  invitationsSent: number;
  invitationsRedeemed: number;
  qualificationThreshold: number | null;
}

export const worldFinalsApi = {
  /**
   * Get qualifications for the current season
   */
  getCurrentSeasonQualifications: async (): Promise<WorldFinalsQualification[]> => {
    const response = await axios.get(`${API_BASE}/qualifications/current`);
    return response.data;
  },

  /**
   * Get qualifications for a specific season
   */
  getSeasonQualifications: async (seasonId: string): Promise<WorldFinalsQualification[]> => {
    const response = await axios.get(`${API_BASE}/qualifications/season/${seasonId}`);
    return response.data;
  },

  /**
   * Get qualification statistics for admin dashboard
   */
  getQualificationStats: async (seasonId?: string): Promise<QualificationStats> => {
    const params = seasonId ? { seasonId } : {};
    const response = await axios.get(`${API_BASE}/stats`, { params });
    return response.data;
  },

  /**
   * Send invitation to a specific qualified competitor (admin only)
   */
  sendInvitation: async (qualificationId: string): Promise<WorldFinalsQualification> => {
    const response = await axios.post(`${API_BASE}/qualifications/${qualificationId}/send-invitation`);
    return response.data;
  },

  /**
   * Send invitations to all qualified competitors who haven't received one (admin only)
   */
  sendAllPendingInvitations: async (seasonId: string): Promise<{ sent: number; failed: number }> => {
    const response = await axios.post(`${API_BASE}/send-all-invitations/${seasonId}`);
    return response.data;
  },

  /**
   * Recalculate all qualifications for a season (admin only)
   */
  recalculateSeasonQualifications: async (seasonId: string): Promise<{
    newQualifications: number;
    updatedQualifications: number;
  }> => {
    const response = await axios.post(`${API_BASE}/recalculate/${seasonId}`);
    return response.data;
  },

  /**
   * Redeem an invitation token for pre-registration
   */
  redeemInvitation: async (token: string): Promise<{
    success: boolean;
    qualification?: WorldFinalsQualification;
    message: string;
  }> => {
    const response = await axios.post(`${API_BASE}/redeem-invitation`, { token });
    return response.data;
  },
};
