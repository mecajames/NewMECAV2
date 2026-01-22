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

// ============================================
// REGISTRATION TYPES
// ============================================

export interface FinalsRegistration {
  id: string;
  memberId: string;
  seasonId: string;
  competitionClass: string;
  vehicleInfo?: string;
  specialRequirements?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'waitlisted';
  registeredAt: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  member?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    mecaId?: number;
  };
  season?: {
    id: string;
    name: string;
    year: number;
  };
}

export interface CreateFinalsRegistrationDto {
  seasonId: string;
  competitionClass: string;
  vehicleInfo?: string;
  specialRequirements?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface UpdateFinalsRegistrationDto {
  competitionClass?: string;
  vehicleInfo?: string;
  specialRequirements?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface RegistrationStats {
  totalRegistrations: number;
  byStatus: { status: string; count: number }[];
  byClass: { className: string; count: number }[];
}

// ============================================
// VOTING TYPES
// ============================================

export interface FinalsVote {
  id: string;
  voterId: string;
  category: string;
  nomineeId?: string;
  nomineeName?: string;
  reason?: string;
  createdAt: string;
  // Populated relations
  voter?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  nominee?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateFinalsVoteDto {
  category: string;
  nomineeId?: string;
  nomineeName?: string;
  reason?: string;
}

export interface VoteSummary {
  category: string;
  totalVotes: number;
  topNominees: { nomineeId?: string; nomineeName: string; voteCount: number }[];
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

  // ============================================
  // REGISTRATION ENDPOINTS
  // ============================================

  /**
   * Create a new registration (authenticated users)
   */
  createRegistration: async (data: CreateFinalsRegistrationDto): Promise<FinalsRegistration> => {
    const response = await axios.post(`${API_BASE}/registrations`, data);
    return response.data;
  },

  /**
   * Get current user's registrations
   */
  getMyRegistrations: async (): Promise<FinalsRegistration[]> => {
    const response = await axios.get(`${API_BASE}/registrations/me`);
    return response.data;
  },

  /**
   * Get current user's registration for a specific season
   */
  getMyRegistrationForSeason: async (seasonId: string): Promise<FinalsRegistration | null> => {
    try {
      const response = await axios.get(`${API_BASE}/registrations/me/season/${seasonId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * Update a registration (owner only)
   */
  updateRegistration: async (id: string, data: UpdateFinalsRegistrationDto): Promise<FinalsRegistration> => {
    const response = await axios.put(`${API_BASE}/registrations/${id}`, data);
    return response.data;
  },

  /**
   * Delete a registration (owner only)
   */
  deleteRegistration: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/registrations/${id}`);
  },

  /**
   * Get all registrations for a season (admin only)
   */
  getRegistrationsBySeason: async (seasonId: string, competitionClass?: string): Promise<FinalsRegistration[]> => {
    const params = competitionClass ? { class: competitionClass } : {};
    const response = await axios.get(`${API_BASE}/registrations/season/${seasonId}`, { params });
    return response.data;
  },

  /**
   * Get registration statistics (admin only)
   */
  getRegistrationStats: async (seasonId: string): Promise<RegistrationStats> => {
    const response = await axios.get(`${API_BASE}/registrations/stats/${seasonId}`);
    return response.data;
  },

  // ============================================
  // VOTING ENDPOINTS
  // ============================================

  /**
   * Submit a vote (authenticated users)
   */
  submitVote: async (data: CreateFinalsVoteDto): Promise<FinalsVote> => {
    const response = await axios.post(`${API_BASE}/votes`, data);
    return response.data;
  },

  /**
   * Get current user's votes
   */
  getMyVotes: async (): Promise<FinalsVote[]> => {
    const response = await axios.get(`${API_BASE}/votes/my-votes`);
    return response.data;
  },

  /**
   * Check if user has voted in a category
   */
  hasVoted: async (category: string): Promise<{ category: string; hasVoted: boolean }> => {
    const response = await axios.get(`${API_BASE}/votes/check/${encodeURIComponent(category)}`);
    return response.data;
  },

  /**
   * Get vote summary (admin only)
   */
  getVoteSummary: async (): Promise<VoteSummary[]> => {
    const response = await axios.get(`${API_BASE}/votes/summary`);
    return response.data;
  },

  /**
   * Get votes by category (admin only)
   */
  getVotesByCategory: async (category: string): Promise<FinalsVote[]> => {
    const response = await axios.get(`${API_BASE}/votes/category/${encodeURIComponent(category)}`);
    return response.data;
  },
};
