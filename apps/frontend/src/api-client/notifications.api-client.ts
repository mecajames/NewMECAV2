/**
 * Notifications API Client
 * Centralized HTTP request functions for Notification operations
 */

import { authenticatedFetch } from './api-helpers';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type NotificationType = 'message' | 'system' | 'alert' | 'info';

export interface NotificationData {
  id: string;
  user_id: string;
  from_user_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  created_at: string;
  read_at?: string;
  from_user?: {
    first_name: string;
    last_name: string;
  };
}

export const notificationsApi = {
  /**
   * Get all notifications for a user
   */
  getByUserId: async (userId: string, limit: number = 10): Promise<NotificationData[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/user/${userId}?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  /**
   * Get unread notification count for a user
   */
  getUnreadCount: async (userId: string): Promise<number> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/user/${userId}/unread-count`);
    if (!response.ok) throw new Error('Failed to fetch unread count');
    const data = await response.json();
    return data.count;
  },

  /**
   * Get a single notification by ID
   */
  getById: async (id: string): Promise<NotificationData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/${id}`);
    if (!response.ok) throw new Error('Failed to fetch notification');
    return response.json();
  },

  /**
   * Mark a notification as read
   * Replaces Supabase RPC: mark_notification_read
   */
  markAsRead: async (notificationId: string): Promise<NotificationData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/${notificationId}/mark-read`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },

  /**
   * Mark all notifications for a user as read
   * Replaces Supabase RPC: mark_all_notifications_read
   */
  markAllAsRead: async (userId: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/user/${userId}/mark-all-read`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
  },

  /**
   * Create a new notification
   */
  create: async (data: Partial<NotificationData>): Promise<NotificationData> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create notification');
    return response.json();
  },

  /**
   * Delete a notification
   */
  delete: async (id: string): Promise<void> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete notification');
  },
};
