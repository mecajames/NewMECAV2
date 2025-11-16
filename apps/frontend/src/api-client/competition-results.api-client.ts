const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CompetitionResult {
  id: string;
  eventId: string;
  competitorId?: string;
  competitorName: string;
  competitionClass: string;
  format?: string;
  score: number;
  placement: number;
  pointsEarned: number;
  vehicleInfo?: string;
  wattage?: number;
  frequency?: number;
  notes?: string;
  createdBy: string;
  seasonId?: string;
  classId?: string;
  createdAt: string;
  mecaId?: string;
  event?: any;
  competitor?: any;
  updatedBy?: string;
  updatedAt?: string;
  revisionCount?: number;
  modificationReason?: string;
  // Legacy snake_case aliases for backwards compatibility
  event_id?: string;
  competitor_id?: string;
  competitor_name?: string;
  competition_class?: string;
  points_earned?: number;
  vehicle_info?: string;
  created_by?: string;
  season_id?: string;
  class_id?: string;
  created_at?: string;
  meca_id?: string;
  updated_by?: string;
  updated_at?: string;
  revision_count?: number;
  modification_reason?: string;
}

export const competitionResultsApi = {
  getAll: async (page: number = 1, limit: number = 100): Promise<CompetitionResult[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch competition results');
    return response.json();
  },

  getById: async (id: string): Promise<CompetitionResult> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/${id}`);
    if (!response.ok) throw new Error('Failed to fetch competition result');
    return response.json();
  },

  getByEvent: async (eventId: string): Promise<CompetitionResult[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/by-event/${eventId}`);
    if (!response.ok) throw new Error('Failed to fetch results for event');
    return response.json();
  },

  getLeaderboard: async (seasonId?: string): Promise<any[]> => {
    const url = seasonId
      ? `${API_BASE_URL}/api/competition-results/leaderboard?seasonId=${seasonId}`
      : `${API_BASE_URL}/api/competition-results/leaderboard`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  },

  create: async (data: Partial<CompetitionResult>): Promise<CompetitionResult> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create competition result');
    return response.json();
  },

  update: async (id: string, data: Partial<CompetitionResult>): Promise<CompetitionResult> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update competition result');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete competition result');
  },

  recalculatePoints: async (eventId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-results/recalculate-points/${eventId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to recalculate points');
    return response.json();
  },

  importResults: async (
    eventId: string,
    file: File,
    createdBy: string
  ): Promise<{ message: string; imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('createdBy', createdBy);

    const response = await fetch(`${API_BASE_URL}/api/competition-results/import/${eventId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to import results');
    }

    return response.json();
  },
};
