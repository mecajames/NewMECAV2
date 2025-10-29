/**
 * Teams API Client
 * Centralized HTTP request functions for Team operations
 */

import { authenticatedFetch } from './api-helpers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface TeamData {
  id: string;
  name: string;
  owner_id: string;
  description?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberData {
  id: string;
  team_id: string;
  member_id: string;
  role: string;
  joined_at: string;
}

export const teamsApi = {
  /**
   * Get all teams
   */
  getAll: async (): Promise<TeamData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams`);
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
  },

  /**
   * Get a single team by ID
   */
  getById: async (id: string): Promise<TeamData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/${id}`);
    if (!response.ok) throw new Error('Failed to fetch team');
    return response.json();
  },

  /**
   * Get teams owned by a user
   */
  getByOwner: async (ownerId: string): Promise<TeamData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/owner/${ownerId}`);
    if (!response.ok) throw new Error('Failed to fetch teams by owner');
    return response.json();
  },

  /**
   * Get teams that a user is a member of
   * This is what Navbar needs to check if user has a team
   */
  getUserTeams: async (userId: string): Promise<TeamData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/user/${userId}/teams`);
    if (!response.ok) throw new Error('Failed to fetch user teams');
    return response.json();
  },

  /**
   * Get members of a team
   */
  getMembers: async (teamId: string): Promise<TeamMemberData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/${teamId}/members`);
    if (!response.ok) throw new Error('Failed to fetch team members');
    return response.json();
  },

  /**
   * Create a new team
   */
  create: async (data: Partial<TeamData>): Promise<TeamData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create team');
    return response.json();
  },

  /**
   * Update a team
   */
  update: async (id: string, data: Partial<TeamData>): Promise<TeamData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update team');
    return response.json();
  },

  /**
   * Delete a team
   */
  delete: async (id: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete team');
  },

  /**
   * Add a member to a team
   */
  addMember: async (teamId: string, memberId: string, role: string = 'member'): Promise<TeamMemberData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberId, role }),
    });
    if (!response.ok) throw new Error('Failed to add team member');
    return response.json();
  },

  /**
   * Remove a member from a team
   */
  removeMember: async (teamId: string, memberId: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove team member');
  },

  /**
   * Update a member's role in a team
   */
  updateMemberRole: async (teamId: string, memberId: string, role: string): Promise<TeamMemberData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/teams/${teamId}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error('Failed to update member role');
    return response.json();
  },
};
