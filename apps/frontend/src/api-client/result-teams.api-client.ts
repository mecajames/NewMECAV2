const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/result-teams/result/${resultId}`);
    if (!response.ok) throw new Error('Failed to fetch result teams');
    return response.json();
  },

  /**
   * Get result teams for a specific team (all results)
   */
  getResultTeamsByTeam: async (teamId: string): Promise<ResultTeam[]> => {
    const response = await fetch(`${API_BASE_URL}/api/result-teams/team/${teamId}`);
    if (!response.ok) throw new Error('Failed to fetch team results');
    return response.json();
  },

  /**
   * Get result teams for a team in a specific season
   */
  getTeamResultsForSeason: async (teamId: string, seasonId: string): Promise<ResultTeam[]> => {
    const response = await fetch(`${API_BASE_URL}/api/result-teams/team/${teamId}/season/${seasonId}`);
    if (!response.ok) throw new Error('Failed to fetch team results for season');
    return response.json();
  },

  /**
   * Get total points for a team in a season
   */
  getTeamPointsForSeason: async (teamId: string, seasonId: string): Promise<TeamSeasonPoints> => {
    const response = await fetch(`${API_BASE_URL}/api/result-teams/team/${teamId}/season/${seasonId}/points`);
    if (!response.ok) throw new Error('Failed to fetch team points');
    return response.json();
  },

  /**
   * Get team standings for a season
   */
  getTeamStandingsBySeason: async (seasonId: string, limit: number = 10): Promise<TeamStanding[]> => {
    const response = await fetch(`${API_BASE_URL}/api/result-teams/standings/season/${seasonId}?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch team standings');
    return response.json();
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Create a result team entry (admin only)
   */
  createResultTeam: async (data: CreateResultTeamDto, authToken: string): Promise<ResultTeam> => {
    const response = await fetch(`${API_BASE_URL}/api/result-teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create result team');
    return response.json();
  },

  /**
   * Delete a result team entry (admin only)
   */
  deleteResultTeam: async (id: string, authToken: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/result-teams/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete result team');
  },
};
