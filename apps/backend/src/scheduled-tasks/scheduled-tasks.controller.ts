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
import { isAdminUser } from '../auth/is-admin.helper';
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
    if (!isAdminUser(profile)) {
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
   * Optionally specify a template key to test a specific branded template
   */
  @Post('send-test-email')
  async sendTestEmail(
    @Headers('authorization') authHeader: string,
    @Body('email') email: string,
    @Body('template') template?: string,
  ) {
    await this.requireAdmin(authHeader);
    if (!email) {
      return { success: false, message: 'Email address is required' };
    }
    if (template) {
      return this.scheduledTasksService.sendTestTemplateEmail(template, email);
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

  /**
   * Manually trigger marking overdue invoices (admin only)
   * Transitions SENT invoices past due date to OVERDUE
   */
  @Post('trigger-mark-overdue')
  async triggerMarkOverdue(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.scheduledTasksService.triggerMarkOverdue();
  }

  /**
   * Manually trigger invoice auto-cancellation (admin only)
   * Cancels overdue invoices past the configured threshold + associated memberships
   */
  @Post('trigger-invoice-auto-cancel')
  async triggerInvoiceAutoCancel(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.scheduledTasksService.triggerInvoiceAutoCancel();
  }

  /**
   * ONE-TIME production migration: issue a renewal token + send the public
   * renewal email to EVERY currently-expired member, so when the hard
   * expired-login gate goes live they all have a working renewal link in
   * their inbox instead of being silently locked out for 24 hours.
   *
   * Safe to run multiple times — `issueToken()` rotates and the email send
   * is idempotent at the member level. Admin-gated.
   */
  @Post('trigger-renewal-backfill')
  async triggerRenewalBackfill(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.scheduledTasksService.triggerRenewalBackfillForExpired();
  }
}
