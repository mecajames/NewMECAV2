const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CompetitionClass {
  id: string;
  name: string;
  abbreviation: string;
  format: string;
  season_id: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const competitionClassesApi = {
  /**
   * Get all competition classes
   */
  getAll: async (): Promise<CompetitionClass[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes`);
    if (!response.ok) {
      throw new Error('Failed to fetch competition classes');
    }
    return response.json();
  },

  /**
   * Get active competition classes only
   */
  getActive: async (): Promise<CompetitionClass[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes/active`);
    if (!response.ok) {
      throw new Error('Failed to fetch active competition classes');
    }
    return response.json();
  },

  /**
   * Get competition classes by season
   */
  getBySeason: async (seasonId: string): Promise<CompetitionClass[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes/season/${seasonId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch competition classes for season');
    }
    return response.json();
  },

  /**
   * Get competition classes by format
   */
  getByFormat: async (format: string): Promise<CompetitionClass[]> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes/format/${format}`);
    if (!response.ok) {
      throw new Error('Failed to fetch competition classes for format');
    }
    return response.json();
  },

  /**
   * Get competition class by ID
   */
  getById: async (id: string): Promise<CompetitionClass> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch competition class ${id}`);
    }
    return response.json();
  },

  /**
   * Create a new competition class
   */
  create: async (data: {
    name: string;
    abbreviation: string;
    format: string;
    season_id: string;
    is_active?: boolean;
    display_order?: number;
  }): Promise<CompetitionClass> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create competition class');
    }
    return response.json();
  },

  /**
   * Update a competition class
   */
  update: async (
    id: string,
    data: {
      name?: string;
      abbreviation?: string;
      format?: string;
      season_id?: string;
      is_active?: boolean;
      display_order?: number;
    }
  ): Promise<CompetitionClass> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update competition class ${id}`);
    }
    return response.json();
  },

  /**
   * Delete a competition class
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete competition class ${id}`);
    }
  },

  /**
   * Copy competition classes from one season to another
   * @param fromSeasonId Source season ID
   * @param toSeasonId Destination season ID
   * @param format Optional format filter ('SPL', 'SQL', 'all', etc.)
   * @returns Object with count of copied classes and the new class objects
   */
  copyBetweenSeasons: async (
    fromSeasonId: string,
    toSeasonId: string,
    format?: string
  ): Promise<{ copied: number; classes: CompetitionClass[] }> => {
    const response = await fetch(`${API_BASE_URL}/api/competition-classes/copy-between-seasons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fromSeasonId, toSeasonId, format }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to copy classes' }));
      throw new Error(error.message || 'Failed to copy classes between seasons');
    }
    return response.json();
  },
};
