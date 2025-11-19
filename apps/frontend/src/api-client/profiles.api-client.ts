const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  role: string;
  membership_status: string;
  membership_expiry?: string;
  meca_id?: string;
  profile_picture_url?: string;
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  shipping_street?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  use_billing_for_shipping?: boolean;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export const profilesApi = {
  getAll: async (page: number = 1, limit: number = 10): Promise<Profile[]> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch profiles');
    return response.json();
  },

  getById: async (id: string): Promise<Profile> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  create: async (data: Partial<Profile>): Promise<Profile> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create profile');
    return response.json();
  },

  update: async (id: string, data: Partial<Profile>): Promise<Profile> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete profile');
  },

  getStats: async (): Promise<{ totalUsers: number; totalMembers: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/stats`);
    if (!response.ok) throw new Error('Failed to fetch profile stats');
    return response.json();
  },
};
