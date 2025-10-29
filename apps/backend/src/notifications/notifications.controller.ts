import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('user/:userId')
  @UseGuards(AuthGuard)
  async getByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    return this.notificationsService.findByUserId(userId, limit ? parseInt(limit.toString()) : 10);
  }

  @Get('user/:userId/unread-count')
  @UseGuards(AuthGuard)
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async get(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  @Post(':id/mark-read')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('user/:userId/mark-all-read')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Param('userId') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.notificationsService.create(data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.notificationsService.delete(id);
  }
}
