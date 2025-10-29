/**
 * Rulebooks API Client
 * Centralized HTTP request functions for Rulebook operations
 */

import { authenticatedFetch } from './api-helpers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface RulebookData {
  id?: string;
  title: string;
  year: number;
  category?: string;
  description?: string;
  fileUrl: string;
  isActive?: boolean;
  displayOrder?: number;
  summaryPoints?: any;
  uploadedById?: string;
}

export const rulebooksApi = {
  getRulebooks: async (page: number = 1, limit: number = 10): Promise<RulebookData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch rulebooks');
    return response.json();
  },

  getRulebook: async (id: string): Promise<RulebookData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks/${id}`);
    if (!response.ok) throw new Error('Failed to fetch rulebook');
    return response.json();
  },

  getActiveRulebooks: async (): Promise<RulebookData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks/active`);
    if (!response.ok) throw new Error('Failed to fetch active rulebooks');
    return response.json();
  },

  getRulebooksByYear: async (year: number): Promise<RulebookData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks/year/${year}`);
    if (!response.ok) throw new Error('Failed to fetch rulebooks by year');
    return response.json();
  },

  getRulebooksByCategory: async (category: string): Promise<RulebookData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks/category/${category}`);
    if (!response.ok) throw new Error('Failed to fetch rulebooks by category');
    return response.json();
  },

  createRulebook: async (data: Partial<RulebookData>): Promise<RulebookData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks`, {
      method: 'POST',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create rulebook');
    return response.json();
  },

  updateRulebook: async (id: string, data: Partial<RulebookData>): Promise<RulebookData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks/${id}`, {
      method: 'PUT',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update rulebook');
    return response.json();
  },

  setDisplayOrder: async (id: string, displayOrder: number): Promise<RulebookData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks/${id}/display-order`, {
      method: 'PUT',
            body: JSON.stringify({ displayOrder }),
    });
    if (!response.ok) throw new Error('Failed to update display order');
    return response.json();
  },

  deleteRulebook: async (id: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/rulebooks/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete rulebook');
  },
};
