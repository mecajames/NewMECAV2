import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const moderationApi = {
  getHiddenImages: async (userId: string, authToken: string): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/api/moderation/images/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  toggleImageVisibility: async (
    data: {
      userId: string;
      imageUrl: string;
      imageType: string;
      hide: boolean;
      link?: string;
    },
    authToken: string,
  ): Promise<{ isHidden: boolean }> => {
    const response = await axios.post(`${API_BASE_URL}/api/moderation/images/toggle`, data, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  deleteImageNotify: async (
    data: {
      userId: string;
      imageUrl: string;
      imageType: string;
      title: string;
      message: string;
      link?: string;
      reason?: string;
      customMessage?: string;
    },
    authToken: string,
  ): Promise<{ success: boolean }> => {
    const response = await axios.post(`${API_BASE_URL}/api/moderation/images/delete-notify`, data, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },
};
