import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { Notification } from './notification.entity';
import { ENTITY_MANAGER } from '../db/database.module';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(ENTITY_MANAGER)
    private readonly em: EntityManager
  ) {}

  /**
   * Find all notifications for a user
   */
  async findByUserId(userId: string, limit: number = 10): Promise<Notification[]> {
    return this.em.find(Notification, { userId }, {
      limit,
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Find notification by ID
   */
  async findById(id: string): Promise<Notification | null> {
    return this.em.findOne(Notification, { id });
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.em.count(Notification, { userId, read: false });
  }

  /**
   * Mark a single notification as read
   * This replaces the Supabase RPC function 'mark_notification_read'
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.em.findOne(Notification, { id: notificationId });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    notification.read = true;
    notification.readAt = new Date();
    await this.em.flush();
    return notification;
  }

  /**
   * Mark all notifications for a user as read
   * This replaces the Supabase RPC function 'mark_all_notifications_read'
   */
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.em.find(Notification, { userId, read: false });
    const now = new Date();

    notifications.forEach(notification => {
      notification.read = true;
      notification.readAt = now;
    });

    await this.em.flush();
  }

  /**
   * Create new notification
   */
  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = this.em.create(Notification, data);
    await this.em.persistAndFlush(notification);
    return notification;
  }

  /**
   * Delete notification
   */
  async delete(id: string): Promise<void> {
    const notification = await this.em.findOne(Notification, { id });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    await this.em.removeAndFlush(notification);
  }
}
