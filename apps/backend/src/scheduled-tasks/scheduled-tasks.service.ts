import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager, wrap } from '@mikro-orm/core';
import { EmailService } from '../email/email.service';
import { InvoicesService } from '../invoices/invoices.service';
import { MembershipsService } from '../memberships/memberships.service';
import { SiteSettingsService } from '../site-settings/site-settings.service';
import { Membership } from '../memberships/memberships.entity';
import { Invoice } from '../invoices/invoices.entity';
import { InvoiceItem } from '../invoices/invoice-items.entity';
import { Event } from '../events/events.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { PaymentStatus, RegistrationStatus, EventStatus, InvoiceStatus, InvoiceItemType } from '@newmeca/shared';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    private readonly invoicesService: InvoicesService,
    private readonly membershipsService: MembershipsService,
    private readonly siteSettingsService: SiteSettingsService,
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
        // Exclude members with active auto-renewal (Stripe will extend them)
        $or: [
          { stripeSubscriptionId: null },
          { cancelAtPeriodEnd: true },
        ],
      },
      {
        populate: ['user', 'membershipTypeConfig'],
      }
    );

    this.logger.log(`Found ${memberships.length} memberships expiring in ${daysRemaining} days (excluding active auto-renewals)`);

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
        // Exclude members with active auto-renewal (Stripe will extend them)
        $or: [
          { stripeSubscriptionId: null },
          { cancelAtPeriodEnd: true },
        ],
      },
      {
        populate: ['user', 'membershipTypeConfig'],
      }
    );

    this.logger.log(`Found ${memberships.length} memberships that expired yesterday (excluding active auto-renewals)`);

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

    // Send lighter nudge reminders to interested (not yet registered) users
    const interestedRegistrations = await em.find(
      EventRegistration,
      {
        event: { id: event.id },
        registrationStatus: RegistrationStatus.INTERESTED,
      },
      {
        populate: ['user'],
      }
    );

    this.logger.log(`Sending interest nudge reminders for event "${event.title}" to ${interestedRegistrations.length} interested users`);

    let sentInterest = 0;
    let failedInterest = 0;

    for (const registration of interestedRegistrations) {
      const email = registration.email || registration.user?.email;
      if (!email) {
        this.logger.warn(`Skipping interested registration ${registration.id} - no email address`);
        continue;
      }

      try {
        await this.emailService.sendEventInterestReminderEmail({
          to: email,
          firstName: registration.firstName || registration.user?.first_name || undefined,
          eventName: event.title,
          eventDate: event.eventDate,
          venueName: event.venueName,
          venueAddress: event.venueAddress,
          venueCity: event.venueCity || undefined,
          venueState: event.venueState || undefined,
          eventId: event.id,
        });
        sentInterest++;
        this.logger.log(`Sent interest nudge reminder to ${email}`);
      } catch (error) {
        failedInterest++;
        this.logger.error(`Failed to send interest nudge reminder to ${email}:`, error);
      }
    }

    this.logger.log(`Interest nudge reminders for event "${event.title}": ${sentInterest} sent, ${failedInterest} failed`);
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
  // MARK OVERDUE INVOICES
  // Runs every hour to transition SENT invoices past due date to OVERDUE
  // =============================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async handleMarkOverdueInvoices() {
    this.logger.log('Running mark overdue invoices job...');

    try {
      const count = await this.invoicesService.markOverdueInvoices();
      this.logger.log(`Mark overdue invoices job completed. Marked ${count} invoices as overdue.`);
    } catch (error) {
      this.logger.error('Error running mark overdue invoices job:', error);
    }
  }

  // =============================================================================
  // AUTO-CANCEL EXPIRED INVOICES
  // Runs daily at 8:00 AM to cancel overdue invoices past the configured threshold
  // =============================================================================

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleAutoCancel() {
    this.logger.log('Running invoice auto-cancel job...');

    try {
      const result = await this.runAutoCancel();
      this.logger.log(`Invoice auto-cancel job completed. ${result.message}`);
    } catch (error) {
      this.logger.error('Error running invoice auto-cancel job:', error);
    }
  }

  private async runAutoCancel(): Promise<{ success: boolean; message: string; cancelled: number }> {
    // Read setting
    const setting = await this.siteSettingsService.findByKey('invoice_auto_cancel_days');
    const autoCancelDays = setting ? parseInt(setting.setting_value, 10) : 0;

    if (!autoCancelDays || autoCancelDays <= 0) {
      return { success: true, message: 'Auto-cancel disabled (setting is 0 or not set)', cancelled: 0 };
    }

    const em = this.em.fork();
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - autoCancelDays);

    // Find all OVERDUE invoices where dueDate + autoCancelDays < now
    const overdueInvoices = await em.find(
      Invoice,
      {
        status: InvoiceStatus.OVERDUE,
        dueDate: { $lt: cutoffDate },
      },
      {
        populate: ['user', 'masterMembership', 'items'],
      }
    );

    this.logger.log(`Found ${overdueInvoices.length} overdue invoices past ${autoCancelDays}-day threshold`);

    let cancelledCount = 0;

    for (const invoice of overdueInvoices) {
      try {
        const reason = `Auto-cancelled: unpaid for ${autoCancelDays}+ days past due date`;

        // Cancel the invoice
        await this.invoicesService.cancel(invoice.id, reason);
        cancelledCount++;

        // Find associated membership
        let membershipId: string | undefined;
        let membershipCancelled = false;

        // Check masterMembership relation first
        if (invoice.masterMembership) {
          membershipId = invoice.masterMembership.id;
        } else {
          // Look for invoice items with itemType = MEMBERSHIP
          const items = invoice.items.getItems();
          const membershipItem = items.find(
            (item: InvoiceItem) => item.itemType === InvoiceItemType.MEMBERSHIP && item.referenceId
          );
          if (membershipItem) {
            membershipId = membershipItem.referenceId;
          }
        }

        // Cancel associated membership if found and still active
        if (membershipId) {
          try {
            const membershipReason = `Auto-cancelled: associated invoice ${invoice.invoiceNumber} unpaid for ${autoCancelDays}+ days`;
            await this.membershipsService.cancelMembershipImmediately(
              membershipId,
              membershipReason,
              'system', // adminId for auto-cancel
            );
            membershipCancelled = true;
            this.logger.log(`Cancelled membership ${membershipId} associated with invoice ${invoice.invoiceNumber}`);
          } catch (membershipError: any) {
            // Membership may already be cancelled or not in PAID status - that's OK
            this.logger.warn(
              `Could not cancel membership ${membershipId} for invoice ${invoice.invoiceNumber}: ${membershipError.message}`
            );
          }
        }

        // Send notification email
        if (invoice.user?.email) {
          try {
            await this.emailService.sendInvoiceAutoCancelledEmail({
              to: invoice.user.email,
              firstName: invoice.user.first_name || undefined,
              invoiceNumber: invoice.invoiceNumber,
              membershipCancelled,
              reason,
            });
            this.logger.log(`Sent auto-cancel notification to ${invoice.user.email} for invoice ${invoice.invoiceNumber}`);
          } catch (emailError) {
            this.logger.error(`Failed to send auto-cancel email for invoice ${invoice.invoiceNumber}:`, emailError);
          }
        }

        this.logger.log(
          `Auto-cancelled invoice ${invoice.invoiceNumber}${membershipCancelled ? ' + membership' : ''}`
        );
      } catch (error) {
        this.logger.error(`Failed to auto-cancel invoice ${invoice.invoiceNumber}:`, error);
      }
    }

    return {
      success: true,
      message: `Cancelled ${cancelledCount} of ${overdueInvoices.length} overdue invoices`,
      cancelled: cancelledCount,
    };
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
        from: 'noreply@mecacaraudio.com',
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
   * Send a specific branded email template with sample data (for testing)
   */
  async sendTestTemplateEmail(templateKey: string, toEmail: string): Promise<{ success: boolean; message: string }> {
    return this.emailService.sendTestTemplateEmail(templateKey, toEmail);
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
   * Manually trigger marking overdue invoices
   */
  async triggerMarkOverdue(): Promise<{ success: boolean; message: string }> {
    try {
      const count = await this.invoicesService.markOverdueInvoices();
      return { success: true, message: `Marked ${count} invoices as overdue` };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }

  /**
   * Manually trigger invoice auto-cancellation
   */
  async triggerInvoiceAutoCancel(): Promise<{ success: boolean; message: string; cancelled: number }> {
    try {
      return await this.runAutoCancel();
    } catch (error) {
      return { success: false, message: `Error: ${error}`, cancelled: 0 };
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
