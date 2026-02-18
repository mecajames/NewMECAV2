import axios from '@/lib/axios';

export interface ResultTeam {
  id: string;
  resultId: string;
  teamId: string;
  createdAt: string;
  // Populated relations
  result?: {
    id: string;
    eventId: string;
    competitorName: string;
    competitionClass: string;
    score: number;
    placement: number;
    pointsEarned: number;
  };
  team?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  totalPoints: number;
  resultCount: number;
  rank?: number;
}

export interface TeamSeasonPoints {
  teamId: string;
  seasonId: string;
  totalPoints: number;
}

export interface CreateResultTeamDto {
  resultId: string;
  teamId: string;
}

export const resultTeamsApi = {
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Get result teams for a specific result
   */
  getResultTeamsByResult: async (resultId: string): Promise<ResultTeam[]> => {
    const response = await axios.get(`/api/result-teams/result/${resultId}`);
    return response.data;
  },

  /**
   * Get result teams for a specific team (all results)
   */
  getResultTeamsByTeam: async (teamId: string): Promise<ResultTeam[]> => {
    const response = await axios.get(`/api/result-teams/team/${teamId}`);
    return response.data;
  },

  /**
   * Get result teams for a team in a specific season
   */
  getTeamResultsForSeason: async (teamId: string, seasonId: string): Promise<ResultTeam[]> => {
    const response = await axios.get(`/api/result-teams/team/${teamId}/season/${seasonId}`);
    return response.data;
  },

  /**
   * Get total points for a team in a season
   */
  getTeamPointsForSeason: async (teamId: string, seasonId: string): Promise<TeamSeasonPoints> => {
    const response = await axios.get(`/api/result-teams/team/${teamId}/season/${seasonId}/points`);
    return response.data;
  },

  /**
   * Get team standings for a season
   */
  getTeamStandingsBySeason: async (seasonId: string, limit: number = 10): Promise<TeamStanding[]> => {
    const response = await axios.get(`/api/result-teams/standings/season/${seasonId}`, {
      params: { limit },
    });
    return response.data;
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Create a result team entry (admin only)
   */
  createResultTeam: async (data: CreateResultTeamDto, authToken: string): Promise<ResultTeam> => {
    const response = await axios.post(`/api/result-teams`, data, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  /**
   * Delete a result team entry (admin only)
   */
  deleteResultTeam: async (id: string, authToken: string): Promise<void> => {
    await axios.delete(`/api/result-teams/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  },
};
