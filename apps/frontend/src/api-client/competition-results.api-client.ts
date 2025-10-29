/**
 * Competition Results API Client
 * Centralized HTTP request functions for Competition Result operations
 */

import { authenticatedFetch } from './api-helpers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CompetitionResultData {
  id?: string;
  eventId: string;
  competitorId: string;
  category?: string;
  placement?: number;
  scoreSound?: number;
  scoreInstall?: number;
  scoreOverall?: number;
  notes?: string;
  createdById?: string;
}

export const competitionResultsApi = {
  getResultsByEvent: async (eventId: string): Promise<CompetitionResultData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/competition-results/event/${eventId}`);
    if (!response.ok) throw new Error('Failed to fetch event results');
    return response.json();
  },

  getLeaderboard: async (eventId: string): Promise<CompetitionResultData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/competition-results/event/${eventId}/leaderboard`);
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  },

  getResultsByCategory: async (eventId: string, category: string): Promise<CompetitionResultData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/competition-results/event/${eventId}/category/${category}`);
    if (!response.ok) throw new Error('Failed to fetch results by category');
    return response.json();
  },

  getResultsByCompetitor: async (competitorId: string): Promise<CompetitionResultData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/competition-results/competitor/${competitorId}`);
    if (!response.ok) throw new Error('Failed to fetch competitor results');
    return response.json();
  },

  getResult: async (id: string): Promise<CompetitionResultData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/competition-results/${id}`);
    if (!response.ok) throw new Error('Failed to fetch result');
    return response.json();
  },

  createResult: async (data: Partial<CompetitionResultData>): Promise<CompetitionResultData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/competition-results`, {
      method: 'POST',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create result');
    return response.json();
  },

  updateResult: async (id: string, data: Partial<CompetitionResultData>): Promise<CompetitionResultData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/competition-results/${id}`, {
      method: 'PUT',
            body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update result');
    return response.json();
  },

  deleteResult: async (id: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/competition-results/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete result');
  },
};
