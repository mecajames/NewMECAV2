import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { NotificationsService } from './notifications.service';
import { Notification } from './notifications.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { UserRole } from '@newmeca/shared';

@Controller('api/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  @Get()
  async getUserNotifications(
    @Query('userId') userId: string,
    @Query('limit') limit: number = 10,
  ): Promise<Notification[]> {
    return this.notificationsService.findByUserId(userId, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Query('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  async getNotification(@Param('id') id: string): Promise<Notification> {
    return this.notificationsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createNotification(@Body() data: Partial<Notification>): Promise<Notification> {
    return this.notificationsService.create(data);
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Put('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Body('userId') userId: string): Promise<void> {
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * Member bulk-delete. Path must come BEFORE the @Delete(':id')
   * handler so the literal 'bulk' segment doesn't get captured as an
   * id. The caller passes their own userId in the body; deletes are
   * scoped server-side to that user, so a member cannot accidentally
   * delete someone else's notifications even by guessing ids.
   */
  @Delete('bulk')
  async bulkDeleteForUser(
    @Body() body: { ids: string[]; userId: string },
  ): Promise<{ deleted: number }> {
    return this.notificationsService.bulkDeleteForUser(body.ids, body.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<void> {
    return this.notificationsService.delete(id, userId);
  }

  // ==========================================
  // Admin Endpoints
  // ==========================================

  @Get('admin/all')
  async getAllNotifications(
    @Headers('authorization') authHeader: string,
    @Query('type') type?: string,
    @Query('read') read?: string,
    @Query('search') search?: string,
    @Query('seasonId') seasonId?: string,
    @Query('dateRange') dateRange?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    await this.requireAdmin(authHeader);
    const allowedRanges = ['7', '30', '45', '90', 'all'] as const;
    const safeDateRange = (allowedRanges as readonly string[]).includes(dateRange ?? '')
      ? (dateRange as '7' | '30' | '45' | '90' | 'all')
      : undefined;
    const result = await this.notificationsService.getAllNotifications({
      type,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      search,
      seasonId: seasonId || undefined,
      dateRange: safeDateRange,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      notifications: result.notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        link: n.link || null,
        createdAt: n.createdAt,
        readAt: n.readAt,
        recipient: n.user ? {
          id: (n.user as any).id,
          firstName: (n.user as any).first_name,
          lastName: (n.user as any).last_name,
          email: (n.user as any).email,
        } : null,
        sender: n.fromUser ? {
          id: (n.fromUser as any).id,
          firstName: (n.fromUser as any).first_name,
          lastName: (n.fromUser as any).last_name,
          email: (n.fromUser as any).email,
        } : null,
      })),
      total: result.total,
    };
  }

  @Get('admin/analytics')
  async getAdminAnalytics(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.notificationsService.getAdminAnalytics();
  }

  /**
   * Admin bulk-delete. Like the member bulk endpoint, the path must
   * come BEFORE the parameterized 'admin/:id' route so the literal
   * 'bulk' segment doesn't get matched as an id.
   */
  @Delete('admin/bulk')
  async adminBulkDelete(
    @Headers('authorization') authHeader: string,
    @Body() body: { ids: string[] },
  ): Promise<{ deleted: number }> {
    await this.requireAdmin(authHeader);
    return this.notificationsService.adminBulkDelete(body.ids);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminDeleteNotification(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    await this.requireAdmin(authHeader);
    return this.notificationsService.adminDelete(id);
  }

  // ==========================================
  // Auto-purge admin endpoints
  // ==========================================

  @Get('admin/purge-setting')
  async getPurgeSetting(@Headers('authorization') authHeader: string): Promise<{ days: number }> {
    await this.requireAdmin(authHeader);
    const days = await this.notificationsService.getPurgeWindowDays();
    return { days };
  }

  @Put('admin/purge-setting')
  async setPurgeSetting(
    @Headers('authorization') authHeader: string,
    @Body() body: { days: number },
  ): Promise<{ days: number }> {
    const { user } = await this.requireAdmin(authHeader);
    return this.notificationsService.setPurgeWindowDays(Number(body.days), user.id);
  }

  @Post('admin/purge-now')
  async runPurgeNow(
    @Headers('authorization') authHeader: string,
  ): Promise<{ deleted: number; windowDays: number }> {
    await this.requireAdmin(authHeader);
    return this.notificationsService.runAutoPurge();
  }

  @Get('admin/active-member-count')
  async getActiveMemberCount(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    const count = await this.notificationsService.getActiveMemberCount();
    return { count };
  }

  @Get('admin/all-user-count')
  async getAllUserCount(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    const count = await this.notificationsService.getAllUserCount();
    return { count };
  }

  @Post('admin/send')
  async adminSendNotification(
    @Headers('authorization') authHeader: string,
    @Body() body: {
      recipientIds?: string[];
      sendToAllActive?: boolean;
      sendToAllUsers?: boolean;
      title: string;
      message: string;
      type: 'message' | 'system' | 'alert' | 'info';
      link?: string;
    },
  ) {
    const { user } = await this.requireAdmin(authHeader);

    // Validate that either recipientIds, sendToAllActive, or sendToAllUsers is provided
    if (!body.sendToAllActive && !body.sendToAllUsers && (!body.recipientIds || body.recipientIds.length === 0)) {
      return {
        success: false,
        sent: 0,
        message: 'No recipients specified. Provide recipientIds, sendToAllActive, or sendToAllUsers.',
      };
    }

    const result = await this.notificationsService.adminSendNotification({
      recipientIds: body.recipientIds,
      sendToAllActive: body.sendToAllActive,
      sendToAllUsers: body.sendToAllUsers,
      title: body.title,
      message: body.message,
      type: body.type,
      fromUserId: user.id,
      link: body.link,
    });

    let successMessage = `Successfully sent ${result.sent} notification(s)`;
    if (body.sendToAllUsers) {
      successMessage = `Successfully sent notification to all ${result.sent} user(s)`;
    } else if (body.sendToAllActive) {
      successMessage = `Successfully sent notification to all ${result.sent} active member(s)`;
    }

    return {
      success: true,
      sent: result.sent,
      message: successMessage,
    };
  }
}
