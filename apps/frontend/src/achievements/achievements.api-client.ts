import axios from '@/lib/axios';
import {
  AchievementDefinition,
  AchievementRecipient,
  MemberAchievement,
  AchievementTemplate,
  CreateAchievementDefinitionDto,
  UpdateAchievementDefinitionDto,
  AchievementFormat,
  AchievementCompetitionType,
} from '@newmeca/shared';

// ==========================================
// Types
// ==========================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MemberAchievementsResponse {
  achievements: MemberAchievement[];
  total_count: number;
}

export interface BackfillResult {
  processed: number;
  awarded: number;
  total: number;
}

export interface BackfillProgress {
  type: 'progress' | 'complete' | 'error';
  processed: number;
  awarded: number;
  total: number;
  percentage: number;
  message?: string;
}

export interface BackfillOptions {
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
}

export interface CheckResultResponse {
  awarded_count: number;
  achievements: Array<{
    id: string;
    achievement_name: string;
    achieved_value: number;
  }>;
}

// ==========================================
// API Client
// ==========================================

export const achievementsApi = {
  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  /**
   * Get achievements for a specific profile
   */
  getAchievementsForProfile: async (profileId: string): Promise<MemberAchievementsResponse> => {
    const response = await axios.get(`/api/achievements/profile/${profileId}`);
    return response.data;
  },

  /**
   * Get achievements for a specific MECA ID
   */
  getAchievementsForMecaId: async (mecaId: string): Promise<MemberAchievementsResponse> => {
    const response = await axios.get(`/api/achievements/meca-id/${mecaId}`);
    return response.data;
  },

  /**
   * Get all available achievement templates
   */
  getTemplates: async (): Promise<AchievementTemplate[]> => {
    const response = await axios.get('/api/achievements/templates');
    return response.data;
  },

  /**
   * Get a specific template by key
   */
  getTemplateByKey: async (key: string): Promise<AchievementTemplate> => {
    const response = await axios.get(`/api/achievements/templates/${key}`);
    return response.data;
  },

  // ==========================================
  // ADMIN ENDPOINTS - Definitions
  // ==========================================

  /**
   * Get all achievement definitions (admin)
   */
  getAllDefinitions: async (params: {
    format?: AchievementFormat;
    competition_type?: AchievementCompetitionType;
    is_active?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<AchievementDefinition>> => {
    const response = await axios.get('/api/achievements/admin/definitions', { params });
    return response.data;
  },

  /**
   * Get a specific achievement definition (admin)
   */
  getDefinitionById: async (id: string): Promise<AchievementDefinition> => {
    const response = await axios.get(`/api/achievements/admin/definitions/${id}`);
    return response.data;
  },

  /**
   * Create a new achievement definition (admin)
   */
  createDefinition: async (data: CreateAchievementDefinitionDto): Promise<AchievementDefinition> => {
    const response = await axios.post('/api/achievements/admin/definitions', data);
    return response.data;
  },

  /**
   * Update an achievement definition (admin)
   */
  updateDefinition: async (id: string, data: UpdateAchievementDefinitionDto): Promise<AchievementDefinition> => {
    const response = await axios.put(`/api/achievements/admin/definitions/${id}`, data);
    return response.data;
  },

  /**
   * Delete an achievement definition (admin)
   */
  deleteDefinition: async (id: string): Promise<{ success: boolean }> => {
    const response = await axios.delete(`/api/achievements/admin/definitions/${id}`);
    return response.data;
  },

  // ==========================================
  // ADMIN ENDPOINTS - Recipients
  // ==========================================

  /**
   * Get all achievement recipients with filters (admin)
   */
  getRecipients: async (params: {
    achievement_id?: string;
    profile_id?: string;
    meca_id?: string;
    season_id?: string;
    group_name?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<AchievementRecipient>> => {
    const response = await axios.get('/api/achievements/admin/recipients', { params });
    return response.data;
  },

  /**
   * Trigger backfill of achievements for existing results (admin)
   * Non-streaming version - returns when complete
   */
  triggerBackfill: async (options?: BackfillOptions): Promise<BackfillResult> => {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const url = `/api/achievements/admin/backfill${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await axios.post(url);
    return response.data;
  },

  /**
   * Stream backfill progress via Server-Sent Events (admin)
   * Returns an EventSource for real-time progress updates
   */
  createBackfillStream: (options?: BackfillOptions): EventSource => {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    // Get the auth token from localStorage (Supabase stores it there)
    const authData = localStorage.getItem('sb-127-auth-token') || localStorage.getItem('supabase.auth.token');
    let token = '';
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        token = parsed.access_token || parsed.currentSession?.access_token || '';
      } catch {
        // Try to find it in any supabase key
        for (const key of Object.keys(localStorage)) {
          if (key.includes('supabase') && key.includes('auth')) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}');
              token = data.access_token || data.currentSession?.access_token || '';
              if (token) break;
            } catch {
              // ignore
            }
          }
        }
      }
    }

    // Add authorization to params (SSE doesn't support custom headers easily)
    if (token) params.append('authorization', `Bearer ${token}`);

    const url = `/api/achievements/admin/backfill-stream${params.toString() ? `?${params.toString()}` : ''}`;
    return new EventSource(url);
  },

  /**
   * Manually check and award achievements for a specific result (admin)
   */
  checkResultForAchievements: async (resultId: string): Promise<CheckResultResponse> => {
    const response = await axios.post(`/api/achievements/admin/check-result/${resultId}`);
    return response.data;
  },

  // ==========================================
  // ADMIN ENDPOINTS - Manual Award
  // ==========================================

  /**
   * Get profiles eligible to receive a specific achievement (admin)
   */
  getEligibleProfiles: async (achievementId: string, search?: string): Promise<Array<{
    id: string;
    meca_id: string;
    name: string;
    email: string;
  }>> => {
    const params = search ? { search } : {};
    const response = await axios.get(`/api/achievements/admin/definitions/${achievementId}/eligible-profiles`, { params });
    return response.data;
  },

  /**
   * Manually award an achievement to a profile (admin)
   */
  manualAwardAchievement: async (dto: {
    profile_id: string;
    achievement_id: string;
    achieved_value: number;
    notes?: string;
  }): Promise<{
    success: boolean;
    recipient: {
      id: string;
      achievement_name: string;
      profile_name: string;
      meca_id: string;
      achieved_value: number;
    };
  }> => {
    const response = await axios.post('/api/achievements/admin/manual-award', dto);
    return response.data;
  },

  /**
   * Delete an achievement recipient (admin)
   * Removes the award from the member and deletes any associated image
   */
  deleteRecipient: async (recipientId: string): Promise<{
    success: boolean;
    deleted: {
      id: string;
      achievement_name: string;
      profile_name: string;
    };
  }> => {
    const response = await axios.delete(`/api/achievements/admin/recipients/${recipientId}`);
    return response.data;
  },
};

export default achievementsApi;
