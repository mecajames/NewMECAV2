import axios from '@/lib/axios';

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
    const response = await axios.get(`/api/states`, {
      params: type ? { type } : undefined,
    });
    return response.data;
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
    const response = await axios.get(`/api/states/search`, {
      params: { q: query },
    });
    return response.data;
  },

  /**
   * Get a state by its abbreviation
   */
  getStateByAbbreviation: async (abbreviation: string): Promise<State | null> => {
    const response = await axios.get(`/api/states/${encodeURIComponent(abbreviation)}`, {
      validateStatus: (status) => status < 500,
    });
    if (response.status === 404) return null;
    if (response.status >= 400) throw new Error('Failed to fetch state');
    return response.data;
  },

  // ============================================
  // STATE FINALS DATE ENDPOINTS
  // ============================================

  /**
   * Get state finals dates for a season
   */
  getStateFinalsDatesBySeason: async (seasonId: string): Promise<StateFinalsDate[]> => {
    const response = await axios.get(`/api/states/finals-dates/season/${seasonId}`);
    return response.data;
  },

  /**
   * Get state finals date for a specific state and season
   */
  getStateFinalsDate: async (stateCode: string, seasonId: string): Promise<StateFinalsDate | null> => {
    const response = await axios.get(`/api/states/finals-dates/${encodeURIComponent(stateCode)}/${seasonId}`, {
      validateStatus: (status) => status < 500,
    });
    if (response.status === 404) return null;
    if (response.status >= 400) throw new Error('Failed to fetch state finals date');
    return response.data;
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
    const response = await axios.post(`/api/states/finals-dates`, data, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  /**
   * Update a state finals date (admin only)
   */
  updateStateFinalsDate: async (
    id: string,
    data: UpdateStateFinalsDateDto,
    authToken: string
  ): Promise<StateFinalsDate> => {
    const response = await axios.put(`/api/states/finals-dates/${id}`, data, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  /**
   * Delete a state finals date (admin only)
   */
  deleteStateFinalsDate: async (id: string, authToken: string): Promise<void> => {
    await axios.delete(`/api/states/finals-dates/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  },
};
