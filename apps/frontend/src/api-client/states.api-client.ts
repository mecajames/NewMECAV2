const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface State {
  id: string;
  name: string;
  abbreviation: string;
  country: string;
  isInternational: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StateFinalsDate {
  id: string;
  stateCode: string;
  seasonId: string;
  finalsDate: string;
  venue?: string;
  city?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  season?: {
    id: string;
    name: string;
    year: number;
  };
}

export interface CreateStateFinalsDateDto {
  stateCode: string;
  seasonId: string;
  finalsDate: string;
  venue?: string;
  city?: string;
  notes?: string;
}

export interface UpdateStateFinalsDateDto {
  finalsDate?: string;
  venue?: string;
  city?: string;
  notes?: string;
}

export const statesApi = {
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Get all states
   */
  getAllStates: async (type?: 'domestic' | 'international'): Promise<State[]> => {
    const url = type
      ? `${API_BASE_URL}/api/states?type=${type}`
      : `${API_BASE_URL}/api/states`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch states');
    return response.json();
  },

  /**
   * Get domestic states only (USA)
   */
  getDomesticStates: async (): Promise<State[]> => {
    return statesApi.getAllStates('domestic');
  },

  /**
   * Get international states/regions only
   */
  getInternationalStates: async (): Promise<State[]> => {
    return statesApi.getAllStates('international');
  },

  /**
   * Search states by name or abbreviation
   */
  searchStates: async (query: string): Promise<State[]> => {
    const response = await fetch(`${API_BASE_URL}/api/states/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search states');
    return response.json();
  },

  /**
   * Get a state by its abbreviation
   */
  getStateByAbbreviation: async (abbreviation: string): Promise<State | null> => {
    const response = await fetch(`${API_BASE_URL}/api/states/${encodeURIComponent(abbreviation)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch state');
    }
    return response.json();
  },

  // ============================================
  // STATE FINALS DATE ENDPOINTS
  // ============================================

  /**
   * Get state finals dates for a season
   */
  getStateFinalsDatesBySeason: async (seasonId: string): Promise<StateFinalsDate[]> => {
    const response = await fetch(`${API_BASE_URL}/api/states/finals-dates/season/${seasonId}`);
    if (!response.ok) throw new Error('Failed to fetch state finals dates');
    return response.json();
  },

  /**
   * Get state finals date for a specific state and season
   */
  getStateFinalsDate: async (stateCode: string, seasonId: string): Promise<StateFinalsDate | null> => {
    const response = await fetch(`${API_BASE_URL}/api/states/finals-dates/${encodeURIComponent(stateCode)}/${seasonId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch state finals date');
    }
    return response.json();
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Create a state finals date (admin only)
   */
  createStateFinalsDate: async (
    data: CreateStateFinalsDateDto,
    authToken: string
  ): Promise<StateFinalsDate> => {
    const response = await fetch(`${API_BASE_URL}/api/states/finals-dates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create state finals date');
    return response.json();
  },

  /**
   * Update a state finals date (admin only)
   */
  updateStateFinalsDate: async (
    id: string,
    data: UpdateStateFinalsDateDto,
    authToken: string
  ): Promise<StateFinalsDate> => {
    const response = await fetch(`${API_BASE_URL}/api/states/finals-dates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update state finals date');
    return response.json();
  },

  /**
   * Delete a state finals date (admin only)
   */
  deleteStateFinalsDate: async (id: string, authToken: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/states/finals-dates/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete state finals date');
  },
};
