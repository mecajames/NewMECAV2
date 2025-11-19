const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CompetitionFormat {
  id: string;
  name: string;
  abbreviation?: string;
  description?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const competitionFormatsApi = {
  /**
   * Get all competition formats
   */
  getAll: async (): Promise<CompetitionFormat[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-formats`);
    if (!response.ok) {
      throw new Error('Failed to fetch competition formats');
    }
    return response.json();
  },

  /**
   * Get active competition formats only
   */
  getActive: async (): Promise<CompetitionFormat[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-formats/active`);
    if (!response.ok) {
      throw new Error('Failed to fetch active competition formats');
    }
    return response.json();
  },

  /**
   * Get competition format by ID
   */
  getById: async (id: string): Promise<CompetitionFormat> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-formats/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch competition format ${id}`);
    }
    return response.json();
  },

  /**
   * Create a new competition format
   */
  create: async (data: {
    name: string;
    description?: string;
    is_active?: boolean;
    display_order?: number;
  }): Promise<CompetitionFormat> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-formats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create competition format');
    }
    return response.json();
  },

  /**
   * Update a competition format
   */
  update: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      is_active?: boolean;
      display_order?: number;
    }
  ): Promise<CompetitionFormat> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-formats/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update competition format ${id}`);
    }
    return response.json();
  },

  /**
   * Delete a competition format
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-formats/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete competition format ${id}`);
    }
  },
};
