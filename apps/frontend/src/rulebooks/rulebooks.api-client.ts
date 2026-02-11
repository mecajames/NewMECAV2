import axios from '@/lib/axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    const response = await axios.get(`${API_BASE_URL}/api/rulebooks`);
    return response.data;
  },

  /**
   * Get all rulebooks (for admin panel)
   */
  getAllRulebooks: async (): Promise<Rulebook[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/rulebooks/admin/all`);
    return response.data;
  },

  getRulebook: async (id: string): Promise<Rulebook> => {
    const response = await axios.get(`${API_BASE_URL}/api/rulebooks/${id}`);
    return response.data;
  },

  createRulebook: async (data: Partial<Rulebook>): Promise<Rulebook> => {
    const response = await axios.post(`${API_BASE_URL}/api/rulebooks`, data);
    return response.data;
  },

  updateRulebook: async (id: string, data: Partial<Rulebook>): Promise<Rulebook> => {
    const response = await axios.put(`${API_BASE_URL}/api/rulebooks/${id}`, data);
    return response.data;
  },

  reorderRulebooks: async (items: { id: string; displayOrder: number }[]): Promise<void> => {
    await axios.put(`${API_BASE_URL}/api/rulebooks/reorder`, items);
  },

  deleteRulebook: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/rulebooks/${id}`);
  },
};
