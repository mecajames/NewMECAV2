const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/site-settings`);
    if (!response.ok) throw new Error('Failed to fetch site settings');
    return response.json();
  },

  getByKey: async (key: string): Promise<SiteSetting> => {
    const response = await fetch(`${API_BASE_URL}/api/site-settings/${key}`);
    if (!response.ok) throw new Error('Failed to fetch setting');
    return response.json();
  },

  upsert: async (
    key: string,
    value: string,
    type: string,
    description: string | undefined,
    updatedBy: string
  ): Promise<SiteSetting> => {
    const response = await fetch(`${API_BASE_URL}/api/site-settings/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, type, description, updatedBy }),
    });
    if (!response.ok) throw new Error('Failed to upsert setting');
    return response.json();
  },

  delete: async (key: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/site-settings/${key}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete setting');
  },
};
