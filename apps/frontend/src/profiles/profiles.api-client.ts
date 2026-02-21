import axios from '@/lib/axios';

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
  member_since: string;
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
    const response = await axios.get(`/api/profiles?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: async (id: string): Promise<Profile> => {
    const response = await axios.get(`/api/profiles/${id}`);
    return response.data;
  },

  create: async (data: Partial<Profile>): Promise<Profile> => {
    const response = await axios.post('/api/profiles', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Profile>): Promise<Profile> => {
    const response = await axios.put(`/api/profiles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/profiles/${id}`);
  },

  getStats: async (): Promise<{ totalUsers: number; totalMembers: number }> => {
    const response = await axios.get('/api/profiles/stats');
    return response.data;
  },

  getPublicProfiles: async (options?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ profiles: Profile[]; total: number; page: number; limit: number }> => {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const query = params.toString();
    const url = query ? `/api/profiles/public?${query}` : '/api/profiles/public';
    const response = await axios.get(url);
    return response.data;
  },

  searchProfiles: async (query: string): Promise<Profile[]> => {
    const response = await axios.get(`/api/profiles/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  searchByMecaId: async (mecaId: string): Promise<Profile[]> => {
    const response = await axios.get(`/api/profiles/search?q=${encodeURIComponent(mecaId)}`);
    const profiles = response.data as Profile[];
    // Filter to exact MECA ID match
    return profiles.filter(p => p.meca_id === mecaId);
  },

  getPublicProfileById: async (id: string): Promise<Profile> => {
    const response = await axios.get(`/api/profiles/public/${id}`);
    return response.data;
  },

  updateCoverImagePosition: async (id: string, position: { x: number; y: number }): Promise<Profile> => {
    const response = await axios.put(`/api/profiles/${id}`, { cover_image_position: position });
    return response.data;
  },

  // ===== Admin Password Management =====

  /**
   * Creates a new user with password (admin only)
   */
  createWithPassword: async (dto: CreateUserWithPasswordDto): Promise<Profile> => {
    const response = await axios.post('/api/profiles/admin/create-with-password', dto);
    return response.data;
  },

  /**
   * Generates a secure password
   */
  generatePassword: async (): Promise<{ password: string; strength: PasswordStrength }> => {
    const response = await axios.get('/api/profiles/admin/generate-password');
    return response.data;
  },

  /**
   * Checks password strength
   */
  checkPasswordStrength: async (password: string): Promise<{
    strength: PasswordStrength;
    meetsMinimum: boolean;
    minimumRequired: number;
  }> => {
    const response = await axios.post('/api/profiles/admin/check-password-strength', { password });
    return response.data;
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
    const response = await axios.post(`/api/profiles/${userId}/reset-password`, dto, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    return response.data;
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
    const response = await axios.get(`/api/profiles/${userId}/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    return response.data;
  },

  // ===== Judge and Event Director Permission Management =====

  /**
   * Gets Judge and Event Director status for a profile (admin only)
   */
  getJudgeEdStatus: async (userId: string, authToken: string): Promise<JudgeEdStatus> => {
    const response = await axios.get(`/api/profiles/${userId}/judge-ed-status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    return response.data;
  },

  /**
   * Updates judge permission for a profile (admin only)
   */
  updateJudgePermission: async (
    userId: string,
    dto: UpdateJudgePermissionDto,
    authToken: string,
  ): Promise<Profile> => {
    const response = await axios.put(`/api/profiles/${userId}/judge-permission`, dto, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    return response.data;
  },

  /**
   * Updates event director permission for a profile (admin only)
   */
  updateEventDirectorPermission: async (
    userId: string,
    dto: UpdateEdPermissionDto,
    authToken: string,
  ): Promise<Profile> => {
    const response = await axios.put(`/api/profiles/${userId}/ed-permission`, dto, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    return response.data;
  },
};
