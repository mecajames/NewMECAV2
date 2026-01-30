const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/seasons`);
    if (!response.ok) {
      throw new Error('Failed to fetch seasons');
    }
    const data = await response.json();
    // Backend already returns snake_case, just return as-is
    return data;
  },

  /**
   * Get current season
   */
  getCurrent: async (): Promise<Season | null> => {
    const response = await fetch(`${API_BASE_URL}/api/seasons/current`);
    if (!response.ok) {
      throw new Error('Failed to fetch current season');
    }
    const season = await response.json();
    if (!season) return null;
    // Backend already returns snake_case
    return season;
  },

  /**
   * Get next season
   */
  getNext: async (): Promise<Season | null> => {
    const response = await fetch(`${API_BASE_URL}/api/seasons/next`);
    if (!response.ok) {
      throw new Error('Failed to fetch next season');
    }
    const season = await response.json();
    if (!season) return null;
    // Backend already returns snake_case
    return season;
  },

  /**
   * Get season by ID
   */
  getById: async (id: string): Promise<Season> => {
    const response = await fetch(`${API_BASE_URL}/api/seasons/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch season ${id}`);
    }
    const season = await response.json();
    // Backend already returns snake_case
    return season;
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
    const response = await fetch(`${API_BASE_URL}/api/seasons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year: data.year,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        is_current: data.is_current || false,
        is_next: data.is_next || false,
        qualification_points_threshold: data.qualification_points_threshold,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to create season');
    }
    const season = await response.json();
    // Backend already returns snake_case
    return season;
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
    const response = await fetch(`${API_BASE_URL}/api/seasons/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        is_current: data.is_current,
        is_next: data.is_next,
        qualification_points_threshold: data.qualification_points_threshold,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update season ${id}`);
    }
    const season = await response.json();
    // Backend already returns snake_case
    return season;
  },

  /**
   * Delete a season
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/seasons/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete season ${id}`);
    }
  },

  /**
   * Set a season as current
   */
  setAsCurrent: async (id: string): Promise<Season> => {
    const response = await fetch(`${API_BASE_URL}/api/seasons/${id}/set-current`, {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error(`Failed to set season ${id} as current`);
    }
    const season = await response.json();
    // Backend already returns snake_case
    return season;
  },

  /**
   * Set a season as next
   */
  setAsNext: async (id: string): Promise<Season> => {
    const response = await fetch(`${API_BASE_URL}/api/seasons/${id}/set-next`, {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error(`Failed to set season ${id} as next`);
    }
    const season = await response.json();
    // Backend already returns snake_case
    return season;
  },
};
