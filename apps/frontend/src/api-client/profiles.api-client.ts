/**
 * Profiles API Client
 *
 * Centralized HTTP request functions for Profile operations.
 * These functions are used by hooks in profiles/apiHooks.ts
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ProfileData {
  id?: string;
  email: string;
  fullName: string;
  phone?: string;
  role?: string;
  membershipStatus?: string;
  avatarUrl?: string;
  bio?: string;
}

export const profilesApi = {
  /**
   * Get all profiles with pagination
   */
  getProfiles: async (page: number = 1, limit: number = 10): Promise<ProfileData[]> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch profiles');
    return response.json();
  },

  /**
   * Get a single profile by ID
   */
  getProfile: async (id: string): Promise<ProfileData> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  /**
   * Create a new profile
   */
  createProfile: async (data: Partial<ProfileData>): Promise<ProfileData> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create profile');
    return response.json();
  },

  /**
   * Update an existing profile
   */
  updateProfile: async (id: string, data: Partial<ProfileData>): Promise<ProfileData> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  /**
   * Delete a profile
   */
  deleteProfile: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete profile');
  },
};
