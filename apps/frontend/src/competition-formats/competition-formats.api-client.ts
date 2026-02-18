import axios from '@/lib/axios';

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
    const response = await axios.get('/api/competition-formats');
    return response.data;
  },

  /**
   * Get active competition formats only
   */
  getActive: async (): Promise<CompetitionFormat[]> => {
    const response = await axios.get('/api/competition-formats/active');
    return response.data;
  },

  /**
   * Get competition format by ID
   */
  getById: async (id: string): Promise<CompetitionFormat> => {
    const response = await axios.get(`/api/competition-formats/${id}`);
    return response.data;
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
    const response = await axios.post('/api/competition-formats', data);
    return response.data;
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
    const response = await axios.put(`/api/competition-formats/${id}`, data);
    return response.data;
  },

  /**
   * Delete a competition format
   */
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/competition-formats/${id}`);
  },
};
