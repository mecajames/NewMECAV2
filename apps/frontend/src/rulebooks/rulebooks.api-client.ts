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
    const response = await fetch(`${API_BASE_URL}/api/rulebooks`);
    if (!response.ok) throw new Error('Failed to fetch rulebooks');
    return response.json();
  },

  /**
   * Get all rulebooks (for admin panel)
   */
  getAllRulebooks: async (): Promise<Rulebook[]> => {
    const response = await fetch(`${API_BASE_URL}/api/rulebooks/admin/all`);
    if (!response.ok) throw new Error('Failed to fetch all rulebooks');
    return response.json();
  },

  getRulebook: async (id: string): Promise<Rulebook> => {
    const response = await fetch(`${API_BASE_URL}/api/rulebooks/${id}`);
    if (!response.ok) throw new Error('Failed to fetch rulebook');
    return response.json();
  },

  createRulebook: async (data: Partial<Rulebook>): Promise<Rulebook> => {
    const response = await fetch(`${API_BASE_URL}/api/rulebooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create rulebook');
    return response.json();
  },

  updateRulebook: async (id: string, data: Partial<Rulebook>): Promise<Rulebook> => {
    console.log('📤 Updating rulebook:', id, data);
    const response = await fetch(`${API_BASE_URL}/api/rulebooks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Rulebook update failed:', response.status, errorText);
      throw new Error(`Failed to update rulebook: ${errorText}`);
    }
    return response.json();
  },

  deleteRulebook: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/rulebooks/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete rulebook');
  },
};
