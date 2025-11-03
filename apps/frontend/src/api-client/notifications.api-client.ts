const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Notification {
  id: string;
  user: { id: string };
  fromUser?: {
    id: string;
    full_name?: string;
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
    const response = await fetch(`${API_BASE_URL}/api/notifications?userId=${userId}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch unread count');
    const data = await response.json();
    return data.count;
  },

  getNotification: async (id: string): Promise<Notification> => {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${id}`);
    if (!response.ok) throw new Error('Failed to fetch notification');
    return response.json();
  },

  createNotification: async (data: Partial<Notification>): Promise<Notification> => {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create notification');
    return response.json();
  },

  markAsRead: async (id: string, userId: string): Promise<Notification> => {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
  },

  deleteNotification: async (id: string, userId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${id}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete notification');
  },
};
