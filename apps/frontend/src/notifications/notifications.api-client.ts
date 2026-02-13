import axios from '@/lib/axios';

export interface Notification {
  id: string;
  user: { id: string };
  fromUser?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  title: string;
  message: string;
  type: 'message' | 'system' | 'alert' | 'info';
  read: boolean;
  link?: string;
  createdAt: string;
  readAt?: string;
}

export const notificationsApi = {
  getUserNotifications: async (userId: string, limit: number = 10): Promise<Notification[]> => {
    try {
      const response = await axios.get(`/api/notifications?userId=${userId}&limit=${limit}`);
      return response.data;
    } catch {
      return []; // Fail gracefully on network errors
    }
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    try {
      const response = await axios.get(`/api/notifications/unread-count?userId=${userId}`);
      return response.data.count;
    } catch {
      return 0; // Fail gracefully on network errors
    }
  },

  getNotification: async (id: string): Promise<Notification> => {
    const response = await axios.get(`/api/notifications/${id}`);
    return response.data;
  },

  createNotification: async (data: Partial<Notification>): Promise<Notification> => {
    const response = await axios.post('/api/notifications', data);
    return response.data;
  },

  markAsRead: async (id: string, userId: string): Promise<Notification> => {
    const response = await axios.put(`/api/notifications/${id}/read`, { userId });
    return response.data;
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    await axios.put('/api/notifications/mark-all-read', { userId });
  },

  deleteNotification: async (id: string, userId: string): Promise<void> => {
    await axios.delete(`/api/notifications/${id}?userId=${userId}`);
  },
};
