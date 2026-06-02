import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationType } from './notifications.entity';
import { Profile } from '../profiles/profiles.entity';
import { Season } from '../seasons/seasons.entity';
import { SiteSettings } from '../site-settings/site-settings.entity';

/**
 * Key used in site_settings to store the auto-purge window (in days).
 * Value is a stringified non-negative integer; "0" means auto-purge is
 * disabled. Read by the daily cron and the admin settings UI.
 */
const PURGE_SETTING_KEY = 'notifications_auto_purge_days';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Create an in-app notification for a single user, only if the user account exists.
   * Wraps errors so notification failure never blocks the calling flow.
   */
  async createForUser(args: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
    fromUserId?: string;
  }): Promise<void> {
    try {
      const em = this.em.fork();
      const user = await em.findOne(Profile, { id: args.userId }, { fields: ['id'] });
      if (!user) {
        this.logger.warn(`Skipped in-app notification — user ${args.userId} not found`);
        return;
      }
      const notification = em.create(Notification, {
        user: args.userId,
        fromUser: args.fromUserId || undefined,
        title: args.title,
        message: args.message,
        type: args.type,
        link: args.link || undefined,
        read: false,
      } as any);
      await em.persistAndFlush(notification);
    } catch (error) {
      this.logger.error(`Failed to create in-app notification for user ${args.userId}: ${error}`);
    }
  }

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

  /**
   * Bulk-delete notifications owned by `userId`. IDs that aren't owned
   * by the user are silently skipped - this prevents leaking the
   * existence of other users' notifications via a 404 oracle. Returns
   * the number actually deleted.
   *
   * Hard cap at 500 ids per request to keep the IN-list bounded.
   */
  async bulkDeleteForUser(ids: string[], userId: string): Promise<{ deleted: number }> {
    if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };
    if (ids.length > 500) {
      throw new BadRequestException('Cannot delete more than 500 notifications in one request');
    }
    const em = this.em.fork();
    const deleted = await em.nativeDelete(Notification, {
      id: { $in: ids },
      user: { id: userId },
    });
    return { deleted };
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
    search?: string;
    seasonId?: string;
    dateRange?: '7' | '30' | '45' | '90' | 'all';
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

    // Date range — relative to now (intersects with season filter below)
    const createdAtConstraints: { $gte?: Date; $lte?: Date } = {};
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange, 10);
      if (!isNaN(days) && days > 0) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        createdAtConstraints.$gte = since;
      }
    }

    // Season filter — bounds notifications to the season's start/end dates
    if (filters?.seasonId) {
      const season = await em.findOne(Season, { id: filters.seasonId });
      if (season) {
        const seasonStart = new Date(season.startDate);
        const seasonEnd = new Date(season.endDate);
        // Intersect with any existing relative-date $gte: pick the later of the two
        if (!createdAtConstraints.$gte || seasonStart > createdAtConstraints.$gte) {
          createdAtConstraints.$gte = seasonStart;
        }
        // Cap at end of season (whichever is earlier — now, or end of season)
        const now = new Date();
        createdAtConstraints.$lte = seasonEnd < now ? seasonEnd : now;
      }
    }

    if (createdAtConstraints.$gte || createdAtConstraints.$lte) {
      where.createdAt = createdAtConstraints;
    }

    // If search is provided, we need to filter by user fields
    if (filters?.search && filters.search.trim()) {
      const searchTerm = filters.search.trim().toLowerCase();

      // Find matching user IDs first
      // Use raw query to support full name search (CONCAT first + last)
      const matchingProfileRows = await em.getConnection().execute(
        `SELECT id FROM profiles
         WHERE email ILIKE ?
            OR first_name ILIKE ?
            OR last_name ILIKE ?
            OR CAST(meca_id AS TEXT) LIKE ?
            OR CONCAT(first_name, ' ', last_name) ILIKE ?`,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `${searchTerm}%`, `%${searchTerm}%`],
      );
      const matchingProfiles = matchingProfileRows as { id: string }[];

      const matchingUserIds = matchingProfiles.map(p => p.id);

      if (matchingUserIds.length === 0) {
        // No matching users, return empty result
        return { notifications: [], total: 0 };
      }

      where.user = { $in: matchingUserIds };
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
   * Admin bulk delete. Unlike bulkDeleteForUser this is not scoped to
   * an owner, so a single admin call can clean up across the whole
   * notifications table.
   *
   * Hard cap at 1000 ids per request to keep the IN-list bounded
   * without forcing the UI to paginate deletes excessively.
   */
  async adminBulkDelete(ids: string[]): Promise<{ deleted: number }> {
    if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };
    if (ids.length > 1000) {
      throw new BadRequestException('Cannot delete more than 1000 notifications in one request');
    }
    const em = this.em.fork();
    const deleted = await em.nativeDelete(Notification, { id: { $in: ids } });
    return { deleted };
  }

  // ==========================================
  // AUTO-PURGE
  // ==========================================

  /**
   * Read the auto-purge window in days from site_settings. 0 means
   * the feature is disabled. Defaults to 0 when the setting row
   * doesn't exist yet (fresh install / new feature).
   */
  async getPurgeWindowDays(): Promise<number> {
    const em = this.em.fork();
    const row = await em.findOne(SiteSettings, { setting_key: PURGE_SETTING_KEY });
    if (!row) return 0;
    const parsed = parseInt(row.setting_value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  /**
   * Persist the auto-purge window (in days). 0 disables the feature.
   * Hard cap at 3650 days (~10 years) - anything longer is functionally
   * equivalent to disabled, and the UI shouldn't offer it.
   */
  async setPurgeWindowDays(days: number, updatedByUserId: string | null): Promise<{ days: number }> {
    if (!Number.isFinite(days) || days < 0 || days > 3650) {
      throw new BadRequestException('Purge window must be between 0 and 3650 days');
    }
    const intDays = Math.floor(days);
    const em = this.em.fork();
    const existing = await em.findOne(SiteSettings, { setting_key: PURGE_SETTING_KEY });
    const isUuid = updatedByUserId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(updatedByUserId);
    if (existing) {
      existing.setting_value = String(intDays);
      existing.updated_by = isUuid ? (updatedByUserId as string) : undefined;
      existing.updated_at = new Date();
    } else {
      const row = em.create(SiteSettings, {
        setting_key: PURGE_SETTING_KEY,
        setting_value: String(intDays),
        setting_type: 'number',
        description: 'Auto-purge notifications older than N days. 0 = disabled.',
        updated_by: isUuid ? (updatedByUserId as string) : undefined,
        updated_at: new Date(),
      });
      em.persist(row);
    }
    await em.flush();
    return { days: intDays };
  }

  /**
   * Delete every notification with created_at older than the configured
   * window. Returns the count actually deleted. No-op when the window
   * is 0 (disabled). Run manually via the admin endpoint and on a
   * daily schedule via the @Cron below.
   */
  async runAutoPurge(): Promise<{ deleted: number; windowDays: number }> {
    const windowDays = await this.getPurgeWindowDays();
    if (windowDays <= 0) {
      return { deleted: 0, windowDays: 0 };
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);
    const em = this.em.fork();
    const deleted = await em.nativeDelete(Notification, { createdAt: { $lt: cutoff } });
    this.logger.log(`Auto-purge: removed ${deleted} notifications older than ${windowDays} days (cutoff ${cutoff.toISOString()})`);
    return { deleted, windowDays };
  }

  /**
   * Daily auto-purge at 03:30 server time. Catches old notifications
   * created during the previous day's traffic. Failure is logged but
   * non-fatal - the next day's run will retry.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledAutoPurge(): Promise<void> {
    try {
      await this.runAutoPurge();
    } catch (err) {
      this.logger.error(`Scheduled notifications auto-purge failed: ${(err as Error).message}`);
    }
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
