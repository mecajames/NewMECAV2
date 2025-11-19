import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Notification } from './notifications.entity';

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
      { user: userId },
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
    return em.count(Notification, { user: userId, read: false });
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const em = this.em.fork();
    const notification = em.create(Notification, data as any);
    await em.persistAndFlush(notification);
    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const em = this.em.fork();
    const notification = await em.findOne(Notification, { id, user: userId });
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
    const notifications = await em.find(Notification, { user: userId, read: false });
    notifications.forEach((notification) => {
      notification.read = true;
      notification.readAt = new Date();
    });
    await em.flush();
  }

  async delete(id: string, userId: string): Promise<void> {
    const em = this.em.fork();
    const notification = await em.findOne(Notification, { id, user: userId });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    await em.removeAndFlush(notification);
  }
}
