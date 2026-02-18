import axios from 'axios';

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
  is_trainer?: boolean;
  // Judge and Event Director permissions
  can_apply_judge?: boolean;
  can_apply_event_director?: boolean;
  judge_permission_granted_at?: string;
  judge_permission_granted_by?: string;
  ed_permission_granted_at?: string;
  ed_permission_granted_by?: string;
  judge_certification_expires?: string;
  ed_certification_expires?: string;
  created_at: string;
  updated_at: string;
}

export interface JudgeEdStatus {
  judge: {
    permissionEnabled: boolean;
    status: string;
    grantedAt: string | null;
    grantedBy: { id: string; name: string } | null;
    expirationDate: string | null;
    judgeRecord: { id: string; level: string; isActive: boolean } | null;
    application: { id: string; status: string; submittedAt: string } | null;
  };
  eventDirector: {
    permissionEnabled: boolean;
    status: string;
    grantedAt: string | null;
    grantedBy: { id: string; name: string } | null;
    expirationDate: string | null;
    edRecord: { id: string; isActive: boolean } | null;
    application: { id: string; status: string; submittedAt: string } | null;
  };
  eventsJudged: Array<{ id: string; name: string; date: string }>;
  eventsDirected: Array<{ id: string; name: string; date: string }>;
}

export interface UpdateJudgePermissionDto {
  enabled: boolean;
  autoComplete?: boolean;
  expirationDate?: string | null;
  judgeLevel?: string;
}

export interface UpdateEdPermissionDto {
  enabled: boolean;
  autoComplete?: boolean;
  expirationDate?: string | null;
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
  mecaId?: string; // Optional - use existing MECA ID for migrated users from old system
}

export interface ResetPasswordDto {
  newPassword: string;
  forcePasswordChange?: boolean;
  sendEmail?: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'registration' | 'payment' | 'membership' | 'result' | 'team';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UpcomingEvent {
  id: string;
  name: string;
  eventDate: string;
  location: string;
  registrationStatus: string;
}

export interface MemberStats {
  totalOrders: number;
  eventsAttended: number;
  trophiesWon: number;
  totalSpent: number;
  teamName: string | null;
  recentActivity: ActivityItem[];
  upcomingEvents: UpcomingEvent[];
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

  update: async (id: string, data: Partial<Profile>, authToken?: string): Promise<Profile> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE_URL}/api/profiles/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update profile' }));
      throw new Error(error.message || 'Failed to update profile');
    }
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

  searchByMecaId: async (mecaId: string): Promise<Profile[]> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/search?q=${encodeURIComponent(mecaId)}`);
    if (!response.ok) throw new Error('Failed to search profiles by MECA ID');
    const profiles = await response.json() as Profile[];
    // Filter to exact MECA ID match
    return profiles.filter(p => p.meca_id === mecaId);
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
   * Checks if email service is configured (admin only)
   */
  getEmailServiceStatus: async (): Promise<{ configured: boolean }> => {
    const response = await axios.get('/api/profiles/admin/email-service-status');
    return response.data;
  },

  /**
   * Resets a user's password (admin only)
   */
  resetPassword: async (userId: string, dto: ResetPasswordDto, authToken: string): Promise<{ success: boolean; emailSent: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to reset password' }));
      throw new Error(error.message || 'Failed to reset password');
    }
    return response.json();
  },

  /**
   * Clears the force password change flag (admin only)
   */
  clearForcePasswordChange: async (userId: string): Promise<{ success: boolean }> => {
    const response = await axios.post(`/api/profiles/${userId}/clear-force-password-change`);
    return response.data;
  },

  /**
   * Gets member statistics including orders, events, trophies, and activity (admin only)
   */
  getMemberStats: async (userId: string, authToken: string): Promise<MemberStats> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${userId}/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch member stats' }));
      throw new Error(error.message || 'Failed to fetch member stats');
    }
    return response.json();
  },

  // ===== Judge and Event Director Permission Management =====

  /**
   * Gets Judge and Event Director status for a profile (admin only)
   */
  getJudgeEdStatus: async (userId: string, authToken: string): Promise<JudgeEdStatus> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${userId}/judge-ed-status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch Judge/ED status' }));
      throw new Error(error.message || 'Failed to fetch Judge/ED status');
    }
    return response.json();
  },

  /**
   * Updates judge permission for a profile (admin only)
   */
  updateJudgePermission: async (
    userId: string,
    dto: UpdateJudgePermissionDto,
    authToken: string,
  ): Promise<Profile> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${userId}/judge-permission`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update judge permission' }));
      throw new Error(error.message || 'Failed to update judge permission');
    }
    return response.json();
  },

  /**
   * Updates event director permission for a profile (admin only)
   */
  updateEventDirectorPermission: async (
    userId: string,
    dto: UpdateEdPermissionDto,
    authToken: string,
  ): Promise<Profile> => {
    const response = await fetch(`${API_BASE_URL}/api/profiles/${userId}/ed-permission`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update event director permission' }));
      throw new Error(error.message || 'Failed to update event director permission');
    }
    return response.json();
  },
};
