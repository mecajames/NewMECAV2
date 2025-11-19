import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './notifications.entity';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<void> {
    return this.notificationsService.delete(id, userId);
  }
}
