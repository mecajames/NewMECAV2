import axios from '@/lib/axios';

export interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description?: string;
  updated_by: string;
  updated_at: string;
}

export const siteSettingsApi = {
  getAll: async (): Promise<SiteSetting[]> => {
    const response = await axios.get('/api/site-settings');
    return response.data;
  },

  getByKey: async (key: string): Promise<SiteSetting> => {
    const response = await axios.get(`/api/site-settings/${key}`);
    return response.data;
  },

  upsert: async (
    key: string,
    value: string,
    type: string,
    description: string | undefined,
    updatedBy: string
  ): Promise<SiteSetting> => {
    const response = await axios.post('/api/site-settings/upsert', { key, value, type, description, updatedBy });
    return response.data;
  },

  delete: async (key: string): Promise<void> => {
    await axios.delete(`/api/site-settings/${key}`);
  },
};
