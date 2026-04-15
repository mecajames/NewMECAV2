import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { EntityManager } from '@mikro-orm/core';
import { isAdminUser } from '../auth/is-admin.helper';
import { Profile } from '../profiles/profiles.entity';
import { AdminNotificationsService } from './admin-notifications.service';

@Controller('api/admin-notifications')
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(req: Request) {
    const authUser = (req as any).user;
    if (!authUser?.id) throw new ForbiddenException('Authentication required');
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: authUser.id });
    if (!isAdminUser(profile)) throw new ForbiddenException('Admin access required');
    return { userId: authUser.id, profile };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async sendTestEmails(
    @Req() req: Request,
    @Body() data: { email?: string },
  ) {
    await this.requireAdmin(req);
    const results = await this.adminNotificationsService.sendTestEmails(data.email);
    return results;
  }

  @Post('test-digest')
  @HttpCode(HttpStatus.OK)
  async sendTestDigest(
    @Req() req: Request,
    @Body() data: { email?: string },
  ) {
    await this.requireAdmin(req);
    await this.adminNotificationsService.sendTestWeeklyDigest(data.email);
    return { success: true, message: 'Weekly digest test sent' };
  }
}
