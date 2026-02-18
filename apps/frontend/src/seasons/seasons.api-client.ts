import axios from '@/lib/axios';

export interface Season {
  id: string;
  year: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isNext: boolean;
  qualificationPointsThreshold?: number | null;
  createdAt: string;
  updatedAt: string;
  // Frontend expects snake_case for compatibility
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  is_next?: boolean;
  qualification_points_threshold?: number | null;
  created_at?: string;
  updated_at?: string;
}

export const seasonsApi = {
  /**
   * Get all seasons
   */
  getAll: async (): Promise<Season[]> => {
    const response = await axios.get('/api/seasons');
    // Backend already returns snake_case, just return as-is
    return response.data;
  },

  /**
   * Get current season
   */
  getCurrent: async (): Promise<Season | null> => {
    const response = await axios.get('/api/seasons/current');
    const season = response.data;
    if (!season) return null;
    // Backend already returns snake_case
    return season;
  },

  /**
   * Get next season
   */
  getNext: async (): Promise<Season | null> => {
    const response = await axios.get('/api/seasons/next');
    const season = response.data;
    if (!season) return null;
    // Backend already returns snake_case
    return season;
  },

  /**
   * Get season by ID
   */
  getById: async (id: string): Promise<Season> => {
    const response = await axios.get(`/api/seasons/${id}`);
    // Backend already returns snake_case
    return response.data;
  },

  /**
   * Create a new season
   */
  create: async (data: {
    year: number;
    name: string;
    start_date: string;
    end_date: string;
    is_current?: boolean;
    is_next?: boolean;
    qualification_points_threshold?: number | null;
  }): Promise<Season> => {
    const response = await axios.post('/api/seasons', {
      year: data.year,
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      is_current: data.is_current || false,
      is_next: data.is_next || false,
      qualification_points_threshold: data.qualification_points_threshold,
    });
    // Backend already returns snake_case
    return response.data;
  },

  /**
   * Update a season
   */
  update: async (
    id: string,
    data: {
      name?: string;
      start_date?: string;
      end_date?: string;
      is_current?: boolean;
      is_next?: boolean;
      qualification_points_threshold?: number | null;
    }
  ): Promise<Season> => {
    const response = await axios.put(`/api/seasons/${id}`, {
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      is_current: data.is_current,
      is_next: data.is_next,
      qualification_points_threshold: data.qualification_points_threshold,
    });
    // Backend already returns snake_case
    return response.data;
  },

  /**
   * Delete a season
   */
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/seasons/${id}`);
  },

  /**
   * Set a season as current
   */
  setAsCurrent: async (id: string): Promise<Season> => {
    const response = await axios.put(`/api/seasons/${id}/set-current`);
    // Backend already returns snake_case
    return response.data;
  },

  /**
   * Set a season as next
   */
  setAsNext: async (id: string): Promise<Season> => {
    const response = await axios.put(`/api/seasons/${id}/set-next`);
    // Backend already returns snake_case
    return response.data;
  },
};
