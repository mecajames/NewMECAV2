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
  imagesGenerated?: number;
  imagesFailed?: number;
}

export interface GenerateImagesResult {
  generated: number;
  failed: number;
}

export interface CheckAssetsResult {
  assetsPath: string;
  templatesPath: string;
  fontsPath: string;
  templatesExist: boolean;
  fontsExist: boolean;
  canvasAvailable: boolean;
  templateFiles: string[];
  fontFiles: string[];
  supabaseBucketAccessible: boolean;
  supabaseBucketError?: string;
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
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<AchievementRecipient>> => {
    const response = await axios.get('/api/achievements/admin/recipients', { params });
    return response.data;
  },

  /**
   * Trigger backfill of achievements for existing results (admin)
   */
  triggerBackfill: async (): Promise<BackfillResult> => {
    const response = await axios.post('/api/achievements/admin/backfill');
    return response.data;
  },

  /**
   * Manually check and award achievements for a specific result (admin)
   */
  checkResultForAchievements: async (resultId: string): Promise<CheckResultResponse> => {
    const response = await axios.post(`/api/achievements/admin/check-result/${resultId}`);
    return response.data;
  },

  /**
   * Generate images for all recipients that don't have one yet (admin)
   */
  generateMissingImages: async (): Promise<GenerateImagesResult> => {
    const response = await axios.post('/api/achievements/admin/generate-images');
    return response.data;
  },

  /**
   * Check if image generation assets are properly configured (admin)
   */
  checkAssets: async (): Promise<CheckAssetsResult> => {
    const response = await axios.get('/api/achievements/admin/check-assets');
    return response.data;
  },

  /**
   * Retry image generation for a specific recipient (admin)
   */
  regenerateImage: async (recipientId: string): Promise<{
    success: boolean;
    error?: string;
    debug: {
      recipientId: string;
      achievementId?: string;
      achievementName?: string;
      templateKey?: string;
      renderValue?: number;
      achievedValue: number;
      existingImageUrl?: string;
    };
    newImageUrl?: string;
  }> => {
    const response = await axios.post(`/api/achievements/admin/recipients/${recipientId}/regenerate-image`);
    return response.data;
  },
};

export default achievementsApi;
