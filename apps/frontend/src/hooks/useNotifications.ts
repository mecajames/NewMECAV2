import { useState, useEffect } from 'react';
import { notificationsApi, Notification } from '../api-client/notifications.api-client';

export function useNotifications(userId: string | undefined, limit: number = 10) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await notificationsApi.getUserNotifications(userId, limit);
      setNotifications(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId, limit]);

  return { notifications, loading, error, refetch: fetchNotifications };
}

export function useUnreadCount(userId: string | undefined) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const unreadCount = await notificationsApi.getUnreadCount(userId);
      setCount(unreadCount);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
  }, [userId]);

  return { count, loading, refetch: fetchCount };
}

export function useMarkAsRead() {
  const [loading, setLoading] = useState(false);

  const markAsRead = async (id: string, userId: string) => {
    setLoading(true);
    try {
      await notificationsApi.markAsRead(id, userId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { markAsRead, loading };
}

export function useMarkAllAsRead() {
  const [loading, setLoading] = useState(false);

  const markAllAsRead = async (userId: string) => {
    setLoading(true);
    try {
      await notificationsApi.markAllAsRead(userId);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { markAllAsRead, loading };
}
