import axios from '@/lib/axios';

export interface Rulebook {
  id: string;
  title: string;
  category: string;
  season: string;
  pdfUrl?: string;
  status: string | boolean;  // String for new format ('active', 'inactive', 'archive'), boolean for legacy
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export const rulebooksApi = {
  /**
   * Get all active rulebooks (already filtered by backend)
   */
  getActiveRulebooks: async (): Promise<Rulebook[]> => {
    const response = await axios.get('/api/rulebooks');
    return response.data;
  },

  /**
   * Get all rulebooks (for admin panel)
   */
  getAllRulebooks: async (): Promise<Rulebook[]> => {
    const response = await axios.get('/api/rulebooks/admin/all');
    return response.data;
  },

  getRulebook: async (id: string): Promise<Rulebook> => {
    const response = await axios.get(`/api/rulebooks/${id}`);
    return response.data;
  },

  createRulebook: async (data: Partial<Rulebook>): Promise<Rulebook> => {
    const response = await axios.post('/api/rulebooks', data);
    return response.data;
  },

  updateRulebook: async (id: string, data: Partial<Rulebook>): Promise<Rulebook> => {
    const response = await axios.put(`/api/rulebooks/${id}`, data);
    return response.data;
  },

  reorderRulebooks: async (items: { id: string; displayOrder: number }[]): Promise<void> => {
    await axios.put('/api/rulebooks/reorder', items);
  },

  deleteRulebook: async (id: string): Promise<void> => {
    await axios.delete(`/api/rulebooks/${id}`);
  },
};
