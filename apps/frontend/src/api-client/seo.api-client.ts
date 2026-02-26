import axios from 'axios';

export interface SeoSettings {
  titleSeparator: string;
  siteName: string;
  defaultDescription: string;
  googleVerification: string;
  bingVerification: string;
  socialImage: string;
  twitterHandle: string;
}

export interface SeoOverride {
  id: string;
  url_path: string;
  title?: string;
  description?: string;
  canonical_url?: string;
  noindex: boolean;
  og_image?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSeoOverrideDto {
  url_path: string;
  title?: string;
  description?: string;
  canonical_url?: string;
  noindex?: boolean;
  og_image?: string;
}

export const seoApi = {
  // Settings
  getSettings: async (): Promise<SeoSettings> => {
    const response = await axios.get('/api/admin/seo/settings');
    return response.data;
  },

  updateSettings: async (settings: Partial<SeoSettings>): Promise<SeoSettings> => {
    const response = await axios.put('/api/admin/seo/settings', settings);
    return response.data;
  },

  // Overrides
  listOverrides: async (): Promise<SeoOverride[]> => {
    const response = await axios.get('/api/admin/seo/overrides');
    return response.data;
  },

  createOverride: async (dto: CreateSeoOverrideDto): Promise<SeoOverride> => {
    const response = await axios.post('/api/admin/seo/overrides', dto);
    return response.data;
  },

  updateOverride: async (id: string, dto: Partial<CreateSeoOverrideDto>): Promise<SeoOverride> => {
    const response = await axios.put(`/api/admin/seo/overrides/${id}`, dto);
    return response.data;
  },

  deleteOverride: async (id: string): Promise<void> => {
    await axios.delete(`/api/admin/seo/overrides/${id}`);
  },

  // Public endpoint - get override for a specific path
  getOverrideForPath: async (path: string): Promise<{ title?: string; description?: string; canonical_url?: string; noindex?: boolean; og_image?: string } | null> => {
    const response = await axios.get('/api/seo/override', { params: { path } });
    return response.data;
  },
};
