/**
 * Competition Classes API Client
 *
 * Centralized HTTP request functions for CompetitionClass operations.
 */

import { authenticatedFetch } from './api-helpers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type CompetitionFormat = 'SPL' | 'SQL' | 'Show and Shine' | 'Ride the Light';

export interface CompetitionClassData {
  id: string;
  name: string;
  abbreviation: string;
  format: CompetitionFormat;
  season_id: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  season?: any; // SeasonData if populated
}

export const classesApi = {
  /**
   * Get all competition classes, optionally filtered by season and/or format
   */
  getAll: async (seasonId?: string, format?: string): Promise<CompetitionClassData[]> => {
    const params = new URLSearchParams();
    if (seasonId) params.append('seasonId', seasonId);
    if (format) params.append('format', format);

    const url = `${API_BASE_URL}/api/classes${params.toString() ? `?${params}` : ''}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) throw new Error('Failed to fetch competition classes');
    return response.json();
  },

  /**
   * Get a single competition class by ID
   */
  getById: async (id: string): Promise<CompetitionClassData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/classes/${id}`);
    if (!response.ok) throw new Error('Failed to fetch competition class');
    return response.json();
  },

  /**
   * Create a new competition class
   */
  create: async (data: Partial<CompetitionClassData>): Promise<CompetitionClassData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/classes`, {
      method: 'POST',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create competition class');
    return response.json();
  },

  /**
   * Update an existing competition class
   */
  update: async (id: string, data: Partial<CompetitionClassData>): Promise<CompetitionClassData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/classes/${id}`, {
      method: 'PUT',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update competition class');
    return response.json();
  },

  /**
   * Delete a competition class
   */
  delete: async (id: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/classes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete competition class');
  },

  /**
   * Copy classes from one season to another
   */
  copyBetweenSeasons: async (
    sourceSeasonId: string,
    destSeasonId: string,
    format?: string,
  ): Promise<{ count: number; classes: CompetitionClassData[] }> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/classes/copy`, {
      method: 'POST',
            body: JSON.stringify({ sourceSeasonId, destSeasonId, format }),
    });
    if (!response.ok) throw new Error('Failed to copy classes');
    return response.json();
  },
};
