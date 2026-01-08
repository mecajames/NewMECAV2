import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Notification } from './notifications.entity';
import { Profile } from '../profiles/profiles.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findByUserId(userId: string, limit: number = 10): Promise<Notification[]> {
    const em = this.em.fork();
    return em.find(
      Notification,
      { user: { id: userId } },
      {
        orderBy: { createdAt: 'DESC' },
        limit,
        populate: ['fromUser'],
      }
    );
  }

  async findById(id: string): Promise<Notification> {
    const em = this.em.fork();
    const notification = await em.findOne(Notification, { id }, { populate: ['fromUser'] });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const em = this.em.fork();
    return em.count(Notification, { user: { id: userId }, read: false });
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const em = this.em.fork();
    const notification = em.create(Notification, data as any);
    await em.persistAndFlush(notification);
    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const em = this.em.fork();
    const notification = await em.findOne(Notification, { id, user: { id: userId } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    notification.read = true;
    notification.readAt = new Date();
    await em.flush();
    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const em = this.em.fork();
    const notifications = await em.find(Notification, { user: { id: userId }, read: false });
    notifications.forEach((notification) => {
      notification.read = true;
      notification.readAt = new Date();
    });
    await em.flush();
  }

  async delete(id: string, userId: string): Promise<void> {
    const em = this.em.fork();
    const notification = await em.findOne(Notification, { id, user: { id: userId } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    await em.removeAndFlush(notification);
  }

  // ==========================================
  // ADMIN METHODS
  // ==========================================

  /**
   * Get all notifications with filters (admin only)
   */
  async getAllNotifications(filters?: {
    type?: string;
    read?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: Notification[]; total: number }> {
    const em = this.em.fork();

    const where: any = {};
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.read !== undefined) {
      where.read = filters.read;
    }

    const [notifications, total] = await em.findAndCount(
      Notification,
      where,
      {
        populate: ['user', 'fromUser'],
        orderBy: { createdAt: 'DESC' },
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      }
    );

    return { notifications, total };
  }

  /**
   * Get notification analytics (admin only)
   */
  async getAdminAnalytics(): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
    readNotifications: number;
    notificationsByType: Record<string, number>;
    notificationsThisMonth: number;
  }> {
    const em = this.em.fork();

    const allNotifications = await em.find(Notification, {});
    const unreadCount = allNotifications.filter(n => !n.read).length;
    const readCount = allNotifications.filter(n => n.read).length;

    // Count by type
    const byType: Record<string, number> = {};
    allNotifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    // This month's count
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCount = allNotifications.filter(n => n.createdAt >= startOfMonth).length;

    return {
      totalNotifications: allNotifications.length,
      unreadNotifications: unreadCount,
      readNotifications: readCount,
      notificationsByType: byType,
      notificationsThisMonth: thisMonthCount,
    };
  }

  /**
   * Admin delete any notification
   */
  async adminDelete(id: string): Promise<void> {
    const em = this.em.fork();
    const notification = await em.findOne(Notification, { id });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    await em.removeAndFlush(notification);
  }

  /**
   * Get all active member IDs (for sending to all active members)
   */
  async getActiveMembers(): Promise<{ id: string; firstName: string; lastName: string; email: string }[]> {
    const em = this.em.fork();
    const profiles = await em.find(
      Profile,
      { membership_status: 'active' },
      {
        fields: ['id', 'first_name', 'last_name', 'email'],
        orderBy: { last_name: 'ASC', first_name: 'ASC' },
      }
    );
    return profiles.map(p => ({
      id: p.id,
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      email: p.email || '',
    }));
  }

  /**
   * Get all users (for sending to everyone regardless of membership status)
   */
  async getAllUsers(): Promise<{ id: string; firstName: string; lastName: string; email: string }[]> {
    const em = this.em.fork();
    const profiles = await em.find(
      Profile,
      {},
      {
        fields: ['id', 'first_name', 'last_name', 'email'],
        orderBy: { last_name: 'ASC', first_name: 'ASC' },
      }
    );
    return profiles.map(p => ({
      id: p.id,
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      email: p.email || '',
    }));
  }

  /**
   * Get count of active members
   */
  async getActiveMemberCount(): Promise<number> {
    const em = this.em.fork();
    return em.count(Profile, { membership_status: 'active' });
  }

  /**
   * Get count of all users
   */
  async getAllUserCount(): Promise<number> {
    const em = this.em.fork();
    return em.count(Profile, {});
  }

  /**
   * Admin send notification to one or more members
   */
  async adminSendNotification(data: {
    recipientIds?: string[];
    sendToAllActive?: boolean;
    sendToAllUsers?: boolean;
    title: string;
    message: string;
    type: 'message' | 'system' | 'alert' | 'info';
    fromUserId?: string;
    link?: string;
  }): Promise<{ sent: number; notifications: Notification[] }> {
    const em = this.em.fork();
    const notifications: Notification[] = [];

    // Get recipient IDs - either from provided list, all active members, or all users
    let recipientIds: string[] = [];
    if (data.sendToAllUsers) {
      const allUsers = await this.getAllUsers();
      recipientIds = allUsers.map(m => m.id);
    } else if (data.sendToAllActive) {
      const activeMembers = await this.getActiveMembers();
      recipientIds = activeMembers.map(m => m.id);
    } else if (data.recipientIds) {
      recipientIds = data.recipientIds;
    }

    if (recipientIds.length === 0) {
      return { sent: 0, notifications: [] };
    }

    for (const recipientId of recipientIds) {
      const notification = em.create(Notification, {
        user: recipientId,
        fromUser: data.fromUserId || undefined,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link || undefined,
        read: false,
      } as any);
      notifications.push(notification);
    }

    await em.persistAndFlush(notifications);

    return {
      sent: notifications.length,
      notifications,
    };
  }
}
