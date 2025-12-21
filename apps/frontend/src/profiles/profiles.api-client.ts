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
  // Public profile fields
  is_public?: boolean;
  vehicle_info?: string;
  car_audio_system?: string;
  profile_images?: string[];
  cover_image_position?: { x: number; y: number };
  force_password_change?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserWithPasswordDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  forcePasswordChange?: boolean;
  sendEmail?: boolean;
}

export interface ResetPasswordDto {
  newPassword: string;
  forcePasswordChange?: boolean;
  sendEmail?: boolean;
}

export interface PasswordStrength {
  score: number;
  strength: string;
  label: string;
  feedback: string[];
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

  getPublicProfiles: async (): Promise<Profile[]> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/public`);
    if (!response.ok) throw new Error('Failed to fetch public profiles');
    return response.json();
  },

  searchProfiles: async (query: string): Promise<Profile[]> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search profiles');
    return response.json();
  },

  getPublicProfileById: async (id: string): Promise<Profile> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/public/${id}`);
    if (!response.ok) throw new Error('Failed to fetch public profile');
    return response.json();
  },

  updateCoverImagePosition: async (id: string, position: { x: number; y: number }): Promise<Profile> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_image_position: position }),
    });
    if (!response.ok) throw new Error('Failed to update cover image position');
    return response.json();
  },

  // ===== Admin Password Management =====

  /**
   * Creates a new user with password (admin only)
   */
  createWithPassword: async (dto: CreateUserWithPasswordDto): Promise<Profile> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/admin/create-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create user' }));
      throw new Error(error.message || 'Failed to create user');
    }
    return response.json();
  },

  /**
   * Generates a secure password
   */
  generatePassword: async (): Promise<{ password: string; strength: PasswordStrength }> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/admin/generate-password`);
    if (!response.ok) throw new Error('Failed to generate password');
    return response.json();
  },

  /**
   * Checks password strength
   */
  checkPasswordStrength: async (password: string): Promise<{
    strength: PasswordStrength;
    meetsMinimum: boolean;
    minimumRequired: number;
  }> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/admin/check-password-strength`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw new Error('Failed to check password strength');
    return response.json();
  },

  /**
   * Checks if email service is configured
   */
  getEmailServiceStatus: async (): Promise<{ configured: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/admin/email-service-status`);
    if (!response.ok) throw new Error('Failed to check email service status');
    return response.json();
  },

  /**
   * Resets a user's password (admin only)
   */
  resetPassword: async (userId: string, dto: ResetPasswordDto): Promise<{ success: boolean; emailSent: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to reset password' }));
      throw new Error(error.message || 'Failed to reset password');
    }
    return response.json();
  },

  /**
   * Clears the force password change flag
   */
  clearForcePasswordChange: async (userId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${userId}/clear-force-password-change`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to clear force password change flag');
    return response.json();
  },
};
