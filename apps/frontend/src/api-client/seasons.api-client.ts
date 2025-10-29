/**
 * Seasons API Client
 * Centralized HTTP request functions for Season operations
 */

import { authenticatedFetch } from './api-helpers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SeasonData {
  id: string;
  year: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_next: boolean;
  created_at?: string;
  updated_at?: string;
}

export const seasonsApi = {
  /**
   * Get all seasons ordered by year (descending)
   */
  getAll: async (): Promise<SeasonData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/seasons`);
    if (!response.ok) throw new Error('Failed to fetch seasons');
    return response.json();
  },

  /**
   * Get a single season by ID
   */
  getById: async (id: string): Promise<SeasonData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/seasons/${id}`);
    if (!response.ok) throw new Error('Failed to fetch season');
    return response.json();
  },

  /**
   * Get the current season
   */
  getCurrent: async (): Promise<SeasonData | null> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/seasons/current`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get the next season
   */
  getNext: async (): Promise<SeasonData | null> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/seasons/next`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Create a new season
   */
  create: async (data: Partial<SeasonData>): Promise<SeasonData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/seasons`, {
      method: 'POST',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create season');
    return response.json();
  },

  /**
   * Update a season
   */
  update: async (id: string, data: Partial<SeasonData>): Promise<SeasonData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/seasons/${id}`, {
      method: 'PUT',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update season');
    return response.json();
  },

  /**
   * Delete a season
   */
  delete: async (id: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/seasons/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete season');
  },
};
