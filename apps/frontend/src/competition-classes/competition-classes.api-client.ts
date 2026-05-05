import axios from '@/lib/axios';

export interface CompetitionClass {
  id: string;
  name: string;
  abbreviation: string;
  format: string;
  season_id: string;
  is_active: boolean;
  unlimited_wattage: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const competitionClassesApi = {
  /**
   * Get all competition classes
   */
  getAll: async (): Promise<CompetitionClass[]> => {
    const response = await axios.get('/api/competition-classes');
    return response.data;
  },

  /**
   * Get active competition classes only
   */
  getActive: async (): Promise<CompetitionClass[]> => {
    const response = await axios.get('/api/competition-classes/active');
    return response.data;
  },

  /**
   * Get competition classes by season
   */
  getBySeason: async (seasonId: string): Promise<CompetitionClass[]> => {
    const response = await axios.get(`/api/competition-classes/season/${seasonId}`);
    return response.data;
  },

  /**
   * Get competition classes by format
   */
  getByFormat: async (format: string): Promise<CompetitionClass[]> => {
    const response = await axios.get(`/api/competition-classes/format/${format}`);
    return response.data;
  },

  /**
   * Get competition class by ID
   */
  getById: async (id: string): Promise<CompetitionClass> => {
    const response = await axios.get(`/api/competition-classes/${id}`);
    return response.data;
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
    unlimited_wattage?: boolean;
    display_order?: number;
  }): Promise<CompetitionClass> => {
    const response = await axios.post('/api/competition-classes', data);
    return response.data;
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
      unlimited_wattage?: boolean;
      display_order?: number;
    }
  ): Promise<CompetitionClass> => {
    const response = await axios.put(`/api/competition-classes/${id}`, data);
    return response.data;
  },

  /**
   * Delete a competition class
   */
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/competition-classes/${id}`);
  },

  /**
   * Copy competition classes from one season to another
   */
  copyBetweenSeasons: async (
    fromSeasonId: string,
    toSeasonId: string,
    format?: string
  ): Promise<{ copied: number; classes: CompetitionClass[] }> => {
    const response = await axios.post('/api/competition-classes/copy-between-seasons', {
      fromSeasonId,
      toSeasonId,
      format,
    });
    return response.data;
  },

  /**
   * Admin export — returns a portable JSON document for the given season.
   * Keyed by season YEAR (not UUID) so it imports cleanly across stage/prod.
   */
  exportSeason: async (seasonId: string): Promise<{
    exportedAt: string;
    season: { year: number; name: string };
    formats: Array<{
      name: string;
      abbreviation?: string;
      description?: string;
      isActive: boolean;
      displayOrder: number;
    }>;
    classes: Array<{
      name: string;
      abbreviation: string;
      format: string;
      isActive: boolean;
      displayOrder: number;
      unlimitedWattage: boolean;
    }>;
  }> => {
    const response = await axios.get('/api/competition-classes/admin/export', {
      params: { seasonId },
    });
    return response.data;
  },

  /**
   * Admin import — accepts the JSON produced by exportSeason. Formats are
   * upserted by name first, then classes by (format + abbreviation).
   * Default mode is 'merge'. 'replace' also deactivates any local class
   * not in the import.
   */
  importSeason: async (
    payload: {
      season: { year: number; name?: string };
      formats?: Array<{
        name: string;
        abbreviation?: string;
        description?: string;
        isActive?: boolean;
        displayOrder?: number;
      }>;
      classes: Array<{
        name: string;
        abbreviation: string;
        format: string;
        isActive?: boolean;
        displayOrder?: number;
        unlimitedWattage?: boolean;
      }>;
      mode?: 'merge' | 'replace';
    },
  ): Promise<{
    seasonId: string;
    seasonYear: number;
    formatsCreated: number;
    formatsUpdated: number;
    created: number;
    updated: number;
    deactivated: number;
    skipped: number;
  }> => {
    const response = await axios.post('/api/competition-classes/admin/import', payload);
    return response.data;
  },
};
