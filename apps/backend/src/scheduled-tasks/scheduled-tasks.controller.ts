import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

@Controller('api/scheduled-tasks')
export class ScheduledTasksController {
  constructor(
    private readonly scheduledTasksService: ScheduledTasksService,
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
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  /**
   * Manually trigger membership expiration emails (admin only)
   * Useful for testing or if cron job was missed
   */
  @Post('trigger-membership-expiration')
  async triggerMembershipExpiration(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.scheduledTasksService.triggerMembershipExpirationEmails();
  }

  /**
   * Manually trigger event reminder emails (admin only)
   * Useful for testing or if cron job was missed
   */
  @Post('trigger-event-reminders')
  async triggerEventReminders(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.scheduledTasksService.triggerEventReminderEmails();
  }

  /**
   * Send a test email to verify configuration (admin only)
   */
  @Post('send-test-email')
  async sendTestEmail(
    @Headers('authorization') authHeader: string,
    @Body('email') email: string,
  ) {
    await this.requireAdmin(authHeader);
    if (!email) {
      return { success: false, message: 'Email address is required' };
    }
    return this.scheduledTasksService.sendTestEmail(email);
  }

  /**
   * Manually trigger event status updates (admin only)
   * Updates events from upcoming→ongoing→completed based on date
   */
  @Post('trigger-event-status-updates')
  async triggerEventStatusUpdates(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.scheduledTasksService.triggerEventStatusUpdates();
  }
}
