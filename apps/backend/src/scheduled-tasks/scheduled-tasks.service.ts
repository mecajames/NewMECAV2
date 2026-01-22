import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import { EmailService } from '../email/email.service';
import { Membership } from '../memberships/memberships.entity';
import { Event } from '../events/events.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { PaymentStatus, RegistrationStatus, EventStatus } from '@newmeca/shared';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
  ) {}

  // =============================================================================
  // MEMBERSHIP EXPIRATION EMAILS
  // Runs every day at 8:00 AM
  // =============================================================================

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleMembershipExpirationEmails() {
    this.logger.log('Running membership expiration email job...');

    try {
      const em = this.em.fork();
      const now = new Date();

      // Calculate date ranges
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      // Find memberships expiring in 30 days (send warning)
      await this.sendExpiringWarnings(em, thirtyDaysFromNow, 30);

      // Find memberships expiring in 7 days (send urgent warning)
      await this.sendExpiringWarnings(em, sevenDaysFromNow, 7);

      // Find memberships that expired yesterday (send expired notification)
      await this.sendExpiredNotifications(em, yesterday);

      this.logger.log('Membership expiration email job completed');
    } catch (error) {
      this.logger.error('Error running membership expiration email job:', error);
    }
  }

  private async sendExpiringWarnings(em: EntityManager, targetDate: Date, daysRemaining: number) {
    // Query for memberships expiring on the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const memberships = await em.find(
      Membership,
      {
        endDate: { $gte: startOfDay, $lte: endOfDay },
        paymentStatus: PaymentStatus.PAID,
      },
      {
        populate: ['user', 'membershipTypeConfig'],
      }
    );

    this.logger.log(`Found ${memberships.length} memberships expiring in ${daysRemaining} days`);

    for (const membership of memberships) {
      if (!membership.user?.email) {
        this.logger.warn(`Skipping membership ${membership.id} - no email address`);
        continue;
      }

      try {
        await this.emailService.sendMembershipExpiringEmail({
          to: membership.user.email,
          firstName: membership.user.first_name || undefined,
          mecaId: membership.mecaId || 0,
          membershipType: membership.membershipTypeConfig?.name || 'Membership',
          expiryDate: membership.endDate!,
          daysRemaining,
          renewalUrl: `${process.env.FRONTEND_URL || 'https://www.maborc.com'}/membership/renew`,
        });
        this.logger.log(`Sent ${daysRemaining}-day expiration warning to ${membership.user.email}`);
      } catch (error) {
        this.logger.error(`Failed to send expiration email to ${membership.user.email}:`, error);
      }
    }
  }

  private async sendExpiredNotifications(em: EntityManager, targetDate: Date) {
    // Query for memberships that expired on the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const memberships = await em.find(
      Membership,
      {
        endDate: { $gte: startOfDay, $lte: endOfDay },
        paymentStatus: PaymentStatus.PAID,
      },
      {
        populate: ['user', 'membershipTypeConfig'],
      }
    );

    this.logger.log(`Found ${memberships.length} memberships that expired yesterday`);

    for (const membership of memberships) {
      if (!membership.user?.email) {
        this.logger.warn(`Skipping membership ${membership.id} - no email address`);
        continue;
      }

      try {
        await this.emailService.sendMembershipExpiredEmail({
          to: membership.user.email,
          firstName: membership.user.first_name || undefined,
          mecaId: membership.mecaId || 0,
          membershipType: membership.membershipTypeConfig?.name || 'Membership',
          expiredDate: membership.endDate!,
          renewalUrl: `${process.env.FRONTEND_URL || 'https://www.maborc.com'}/membership/renew`,
        });
        this.logger.log(`Sent expiration notification to ${membership.user.email}`);
      } catch (error) {
        this.logger.error(`Failed to send expired email to ${membership.user.email}:`, error);
      }
    }
  }

  // =============================================================================
  // EVENT REMINDER EMAILS
  // Runs every day at 8:00 AM
  // =============================================================================

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleEventReminderEmails() {
    this.logger.log('Running event reminder email job...');

    try {
      const em = this.em.fork();
      const now = new Date();

      // Calculate tomorrow's date
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfDay = new Date(tomorrow);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(tomorrow);
      endOfDay.setHours(23, 59, 59, 999);

      // Find events happening tomorrow
      const events = await em.find(
        Event,
        {
          eventDate: { $gte: startOfDay, $lte: endOfDay },
          status: EventStatus.UPCOMING,
        }
      );

      this.logger.log(`Found ${events.length} events happening tomorrow`);

      for (const event of events) {
        await this.sendEventReminders(em, event);
      }

      this.logger.log('Event reminder email job completed');
    } catch (error) {
      this.logger.error('Error running event reminder email job:', error);
    }
  }

  private async sendEventReminders(em: EntityManager, event: Event) {
    // Find all confirmed registrations for this event
    const registrations = await em.find(
      EventRegistration,
      {
        event: { id: event.id },
        registrationStatus: RegistrationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      },
      {
        populate: ['user', 'classes'],
      }
    );

    this.logger.log(`Sending reminders for event "${event.title}" to ${registrations.length} registrants`);

    for (const registration of registrations) {
      const email = registration.email || registration.user?.email;
      if (!email) {
        this.logger.warn(`Skipping registration ${registration.id} - no email address`);
        continue;
      }

      try {
        // Build class list
        const classes = await registration.classes.loadItems();
        const classList = classes.map(c => ({
          format: c.format || 'Unknown',
          className: c.className || 'Unknown',
        }));

        await this.emailService.sendEventReminderEmail({
          to: email,
          firstName: registration.firstName || registration.user?.first_name || undefined,
          eventName: event.title,
          eventDate: event.eventDate,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          venueCity: event.venueCity || undefined,
          venueState: event.venueState || undefined,
          checkInCode: registration.checkInCode || '',
          classes: classList,
          qrCodeData: registration.qrCodeData || undefined,
        });
        this.logger.log(`Sent event reminder to ${email}`);
      } catch (error) {
        this.logger.error(`Failed to send event reminder to ${email}:`, error);
      }
    }
  }

  // =============================================================================
  // EVENT STATUS AUTO-UPDATE
  // Runs every hour to update event statuses based on date
  // =============================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async handleEventStatusUpdates() {
    this.logger.log('Running event status update job...');

    try {
      const em = this.em.fork();
      const now = new Date();

      // Get start and end of today for "ongoing" detection
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      // Find events that should be marked as "ongoing" (event date is today)
      const ongoingEvents = await em.find(Event, {
        eventDate: { $gte: startOfToday, $lte: endOfToday },
        status: EventStatus.UPCOMING,
      });

      for (const event of ongoingEvents) {
        event.status = EventStatus.ONGOING;
        this.logger.log(`Updated event "${event.title}" to ONGOING`);
      }

      // Find events that should be marked as "completed" (event date has passed)
      const completedEvents = await em.find(Event, {
        eventDate: { $lt: startOfToday },
        status: { $in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
      });

      for (const event of completedEvents) {
        event.status = EventStatus.COMPLETED;
        this.logger.log(`Updated event "${event.title}" to COMPLETED`);
      }

      await em.flush();

      const totalUpdated = ongoingEvents.length + completedEvents.length;
      this.logger.log(`Event status update job completed. Updated ${totalUpdated} events (${ongoingEvents.length} ongoing, ${completedEvents.length} completed)`);
    } catch (error) {
      this.logger.error('Error running event status update job:', error);
    }
  }

  // =============================================================================
  // MANUAL TRIGGER METHODS (for testing or admin use)
  // =============================================================================

  /**
   * Manually trigger membership expiration emails (for testing)
   */
  async triggerMembershipExpirationEmails(): Promise<{ success: boolean; message: string }> {
    try {
      await this.handleMembershipExpirationEmails();
      return { success: true, message: 'Membership expiration emails job completed. Check server logs for details.' };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }

  /**
   * Send a test email to verify email configuration (for testing)
   */
  async sendTestEmail(toEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.emailService.sendEmail({
        to: toEmail,
        subject: 'MECA Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ea580c;">Test Email from MECA</h1>
            <p>This is a test email to verify your email configuration is working correctly.</p>
            <p>If you received this email, your email settings are configured properly!</p>
            <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #64748b; font-size: 12px;">
              Sent at: ${new Date().toISOString()}<br>
              Provider: ${this.emailService.getProvider() || 'Not configured'}
            </p>
          </div>
        `,
        text: 'This is a test email from MECA to verify your email configuration is working correctly.',
      });

      if (result.success) {
        return { success: true, message: `Test email sent successfully to ${toEmail}` };
      } else {
        return { success: false, message: `Failed to send test email: ${result.error}` };
      }
    } catch (error: any) {
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  /**
   * Manually trigger event reminder emails (for testing)
   */
  async triggerEventReminderEmails(): Promise<{ success: boolean; message: string }> {
    try {
      await this.handleEventReminderEmails();
      return { success: true, message: 'Event reminder emails sent successfully' };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }

  /**
   * Manually trigger event status updates (for testing or immediate update)
   */
  async triggerEventStatusUpdates(): Promise<{ success: boolean; message: string; updated: number }> {
    try {
      const em = this.em.fork();
      const now = new Date();

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      // Find and update ongoing events
      const ongoingEvents = await em.find(Event, {
        eventDate: { $gte: startOfToday, $lte: endOfToday },
        status: EventStatus.UPCOMING,
      });

      for (const event of ongoingEvents) {
        event.status = EventStatus.ONGOING;
      }

      // Find and update completed events
      const completedEvents = await em.find(Event, {
        eventDate: { $lt: startOfToday },
        status: { $in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
      });

      for (const event of completedEvents) {
        event.status = EventStatus.COMPLETED;
      }

      await em.flush();

      const totalUpdated = ongoingEvents.length + completedEvents.length;
      return {
        success: true,
        message: `Updated ${totalUpdated} events (${ongoingEvents.length} to ongoing, ${completedEvents.length} to completed)`,
        updated: totalUpdated,
      };
    } catch (error) {
      return { success: false, message: `Error: ${error}`, updated: 0 };
    }
  }
}
