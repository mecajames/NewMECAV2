const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface DashboardStatistics {
  totalUsers: number;
  totalEvents: number;
  totalRegistrations: number;
  totalMembers: number;
}

export const statisticsApi = {
  /**
   * Get dashboard statistics
   * GET /api/statistics
   */
  getStatistics: async (): Promise<DashboardStatistics> => {
    const response = await fetch(`${API_BASE_URL}/api/statistics`);
    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }
    return response.json();
  },
};
