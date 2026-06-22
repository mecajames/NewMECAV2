import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager, wrap } from '@mikro-orm/core';
import { EmailService } from '../email/email.service';
import { InvoicesService } from '../invoices/invoices.service';
import { RecurringInvoicesService } from '../recurring-invoices/recurring-invoices.service';
import { MembershipsService } from '../memberships/memberships.service';
import { MembershipRenewalTokenService } from '../memberships/membership-renewal-token.service';
import { ShopService } from '../shop/shop.service';
import { MembershipCompsService } from '../membership-comps/membership-comps.service';
import { SiteSettingsService } from '../site-settings/site-settings.service';
import { UserActivityService } from '../user-activity/user-activity.service';
import { StripeService } from '../stripe/stripe.service';
import { AdminNotificationsService } from '../admin-notifications/admin-notifications.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly recurringInvoicesService: RecurringInvoicesService,
    private readonly membershipsService: MembershipsService,
    private readonly shopService: ShopService,
    private readonly compsService: MembershipCompsService,
    private readonly siteSettingsService: SiteSettingsService,
    private readonly userActivityService: UserActivityService,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
    private readonly adminNotificationsService: AdminNotificationsService,
    private readonly notificationsService: NotificationsService,
    private readonly renewalTokenService: MembershipRenewalTokenService,
  ) {}

  /**
   * Member-facing lifecycle automation (renewal reminders + dunning) must run
   * ONLY on production. Stage/clone instances hold real member data copied from
   * prod; running these jobs there issues renewal tokens, auto-suspends
   * memberships, and (pre-fix) emailed real members renewal links pointing at
   * the test-mode stage site. The email layer also fail-safes non-prod sends,
   * but we additionally stop the work from running at all so stage never mutates
   * cloned member lifecycle state. See the 2026-06-05 stage-renewal-email incident.
   */
  private get isProductionEnv(): boolean {
    const appEnv = (process.env.APP_ENV || '').toLowerCase().trim();
    return appEnv === 'production' || appEnv === 'prod';
  }

  // =============================================================================
  // MEMBERSHIP STATUS RECONCILE — keep profiles.membership_status accurate.
  // The denormalized label had no job maintaining it, so lapsed members stayed
  // labelled 'active' (sending them to a "please log in" dead end at checkout
  // and slipping past the expired-login gate). This reconciles the label to the
  // source of truth and runs daily so it never drifts again.
  // =============================================================================

  // "Active" mirrors ActiveMembershipGuard: a PAID, unexpired membership OR an
  // active free_period comp (comps MUST count — otherwise a comped member would
  // be labelled 'expired' and the frontend gate would sign them out). Ever-paid
  // members who aren't currently active → 'expired'; everyone else → 'none'.
  // References the alias `p` (public.profiles p) used by both queries below.
  private static readonly DESIRED_MEMBERSHIP_STATUS_SQL = `CASE
    WHEN EXISTS (
      SELECT 1 FROM public.memberships m
       WHERE m.user_id = p.id AND m.payment_status = 'paid'
         AND (m.end_date IS NULL OR m.end_date > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.membership_comps c
        JOIN public.memberships mc ON mc.id = c.membership_id
       WHERE mc.user_id = p.id AND c.comp_type = 'free_period'
         AND c.status = 'active' AND (c.ends_at IS NULL OR c.ends_at > now())
    )
      THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM public.memberships m2
       WHERE m2.user_id = p.id AND m2.payment_status = 'paid'
    )
      THEN 'expired'
    ELSE 'none'
  END`;

  /**
   * Reconcile profiles.membership_status against the source of truth (paid +
   * unexpired membership, or an active free_period comp). Set-based, idempotent,
   * and lockout-safe (comps count as active). Pass { dryRun: true } to preview
   * the change counts without writing anything.
   */
  async reconcileMembershipStatuses(opts: { dryRun?: boolean } = {}): Promise<{
    dryRun: boolean;
    totalChanged: number;
    changes: Array<{ from: string; to: string; count: number }>;
  }> {
    const conn = this.em.getConnection();
    const desired = ScheduledTasksService.DESIRED_MEMBERSHIP_STATUS_SQL;

    const rows = await conn.execute<any[]>(
      `SELECT COALESCE(p.membership_status::text, '(null)') AS from_status,
              (${desired}) AS to_status,
              count(*)::int AS n
         FROM public.profiles p
        WHERE p.membership_status::text IS DISTINCT FROM (${desired})
        GROUP BY 1, 2
        ORDER BY n DESC`,
    );
    const changes = (rows || []).map((r: any) => ({
      from: String(r.from_status),
      to: String(r.to_status),
      count: Number(r.n),
    }));
    const totalChanged = changes.reduce((s: number, c: { count: number }) => s + c.count, 0);

    if (!opts.dryRun && totalChanged > 0) {
      await conn.execute(
        `UPDATE public.profiles AS p
            SET membership_status = (${desired})::public.membership_status
          WHERE p.membership_status::text IS DISTINCT FROM (${desired})`,
      );
    }

    this.logger.log(
      `reconcileMembershipStatuses(${opts.dryRun ? 'dry-run' : 'apply'}): ${totalChanged} profile(s) ${opts.dryRun ? 'would change' : 'changed'}${changes.length ? ' — ' + changes.map((c: { from: string; to: string; count: number }) => `${c.from}->${c.to}:${c.count}`).join(', ') : ''}`,
    );
    return { dryRun: !!opts.dryRun, totalChanged, changes };
  }

  // Runs daily. NOT prod-gated: it sends no emails / issues no tokens and only
  // corrects a denormalized label to match the membership truth, so it's safe
  // (and beneficial) in every environment.
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async reconcileMembershipStatusesCron() {
    try {
      await this.reconcileMembershipStatuses();
    } catch (err) {
      this.logger.error(`Daily membership-status reconcile failed: ${err}`);
    }
  }

  // =============================================================================
  // DUNNING — escalating emails on failed renewal payments, auto-suspend at day 14.
  // Steps: day 1 → step 1, day 3 → step 2, day 7 → step 3, day 14 → step 4 (suspend).
  // =============================================================================
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processFailedPaymentDunning() {
    if (!this.isProductionEnv) {
      this.logger.log(`Skipping dunning job — non-production (APP_ENV="${process.env.APP_ENV || ''}")`);
      return;
    }
    this.logger.log('Running dunning job...');
    const em = this.em.fork();

    const failed = await em.find(
      Membership,
      { paymentStatus: PaymentStatus.FAILED, cancelledAt: null },
      { populate: ['user', 'membershipTypeConfig'] },
    );
    if (failed.length === 0) {
      this.logger.log('No failed-payment memberships to process.');
      return;
    }

    const portalBase = (process.env.FRONTEND_URL || 'http://localhost:5173') + '/dashboard';
    let sent = 0;
    let suspended = 0;

    for (const m of failed) {
      // Anchor cadence on the dedicated failed_at column (set when the renewal
      // first failed) — STABLE, unlike updated_at which unrelated writes and this
      // cron itself bump (which slipped escalation). Fall back to updated_at for
      // rows that failed before failed_at existed.
      const failedAt = m.failedAt ?? m.updatedAt ?? m.createdAt;
      if (!failedAt) continue;
      const daysSinceFailed = Math.floor((Date.now() - failedAt.getTime()) / 86400000);

      const desiredStep =
        daysSinceFailed >= 14 ? 4 :
        daysSinceFailed >= 7 ? 3 :
        daysSinceFailed >= 3 ? 2 :
        daysSinceFailed >= 1 ? 1 : 0;

      if (desiredStep === 0) continue;
      if ((m.lastDunningStep ?? 0) >= desiredStep) continue;
      if (!m.user?.email) continue;

      try {
        await this.emailService.sendPaymentFailedDunningEmail({
          to: m.user.email,
          firstName: m.user.first_name || undefined,
          membershipType: m.membershipTypeConfig?.name || 'Membership',
          amountDue: Number(m.amountPaid).toFixed(2),
          step: desiredStep as 1 | 2 | 3 | 4,
          portalUrl: portalBase,
        });
        if (m.user?.id) {
          await this.notificationsService.createForUser({
            userId: m.user.id,
            title: `Payment failed — action required`,
            message: `Your ${m.membershipTypeConfig?.name || 'membership'} renewal payment of $${Number(m.amountPaid).toFixed(2)} failed (attempt ${desiredStep}). Update your payment method to avoid suspension.`,
            type: 'alert',
            link: '/billing',
          });
        }
        m.lastDunningStep = desiredStep;
        m.lastDunningAt = new Date();
        sent++;

        if (desiredStep === 4) {
          m.paymentStatus = PaymentStatus.CANCELLED;
          m.cancelledAt = new Date();
          m.suspendedAt = new Date();
          m.cancellationReason = 'Auto-suspended after 14 days of failed payments (dunning)';
          m.cancelledBy = 'system';
          suspended++;
        }
        await em.flush();
      } catch (err) {
        this.logger.error(`Dunning email failed for membership ${m.id}: ${err}`);
      }
    }

    this.logger.log(`Dunning complete. Sent ${sent} emails, suspended ${suspended} memberships.`);
  }

  // =============================================================================
  // STRIPE SUBSCRIPTION CATCH-UP SYNC
  // Runs hourly. Catches cancellations done outside the app (member cancels in
  // Stripe Dashboard, or webhook missed during a deploy/network blip). Without
  // this, externally-cancelled subscriptions stay marked active in our DB
  // forever.
  // =============================================================================
  @Cron(CronExpression.EVERY_HOUR)
  async syncStripeSubscriptionStatus() {
    this.logger.log('Running Stripe subscription catch-up sync...');
    const em = this.em.fork();

    const memberships = await em.find(Membership, {
      stripeSubscriptionId: { $ne: null },
      paymentStatus: PaymentStatus.PAID,
      cancelledAt: null,
    });

    if (memberships.length === 0) {
      this.logger.log('No active subscriptions to sync.');
      return;
    }

    this.logger.log(`Checking ${memberships.length} active subscriptions...`);
    let synced = 0;

    // A dead Stripe SUBSCRIPTION is NOT a cancelled MEMBERSHIP. Cancelling
    // the subscription means "stop auto-renewal" — the member already PAID
    // for the current term, which runs through endDate regardless. So a
    // dead subscription is DETACHED (mirroring the customer.subscription.deleted
    // webhook handler, which this job exists to catch-up for) and the
    // membership stays paid. Immediate membership cancellation only ever
    // happens through an explicit cancel/refund flow.
    const detachDeadSubscription = async (m: Membership, why: string) => {
      const deadSubId = m.stripeSubscriptionId;
      m.stripeSubscriptionId = undefined;
      m.hadLegacySubscription = true;
      m.cancelAtPeriodEnd = false;
      synced++;
      await em.flush();
      this.logger.warn(
        `Detached dead Stripe subscription ${deadSubId} from membership ${m.id} (${why}). ` +
        `Membership stays paid through ${m.endDate?.toISOString().split('T')[0] ?? 'no end date'}.`,
      );

      await em.populate(m, ['user', 'membershipTypeConfig']);
      this.adminNotificationsService.notifySubscriptionCancelled(m).catch((err) => {
        this.logger.error(`Admin notification failed (non-critical): ${err}`);
      });
      // Deliberately NO member email here: this job is catch-up for missed
      // webhooks, so the cancellation may be weeks old — a late "your
      // subscription has ended" email reads as a new cancellation and
      // generates confused support tickets. The real-time webhook handler
      // (customer.subscription.deleted) is the path that emails the member.
    };

    for (const m of memberships) {
      try {
        const sub = await this.stripeService.getSubscription(m.stripeSubscriptionId!);

        // Stripe says the subscription ended → detach it; membership keeps
        // running through its paid-for endDate.
        if (['canceled', 'incomplete_expired', 'unpaid'].includes(sub.status)) {
          await detachDeadSubscription(m, `Stripe status: ${sub.status}`);
          continue;
        }

        // Cancel-at-period-end drift
        if (Boolean(m.cancelAtPeriodEnd) !== Boolean(sub.cancel_at_period_end)) {
          m.cancelAtPeriodEnd = sub.cancel_at_period_end;
          await em.flush();
          this.logger.log(`Synced membership ${m.id} cancel_at_period_end → ${sub.cancel_at_period_end}`);
        }
      } catch (err: any) {
        // StripeService wraps errors in BadRequestException; "No such subscription"
        // is Stripe's literal error string for a deleted/non-existent sub.
        const msg = String(err?.message ?? err ?? '');
        if (/No such subscription/i.test(msg)) {
          await detachDeadSubscription(m, 'subscription not found in Stripe');
        } else {
          this.logger.error(`Failed to sync membership ${m.id}: ${err}`);
        }
      }
    }

    if (synced > 0) {
      // Members list serves from a cache — make the detachments visible.
      this.membershipsService.clearAdminMembershipsListCache();
    }
    this.logger.log(`Stripe sync complete. Detached ${synced} dead subscription(s).`);
  }

  // =============================================================================
  // MEMBERSHIP EXPIRATION EMAILS
  // Runs every day at 8:00 AM
  // =============================================================================

  // Email cadence per docs/features/MEMBERSHIP_LIFECYCLE.md §8.
  //   Active side : -30, -14, -7, -1   → link to /membership/checkout/:id
  //   Expired side: +1, +7, +14, +30   → link to /renew/:token (public)
  // After +30 we send NO further nag emails.
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleMembershipExpirationEmails() {
    if (!this.isProductionEnv) {
      this.logger.log(`Skipping membership expiration email job — non-production (APP_ENV="${process.env.APP_ENV || ''}")`);
      return;
    }
    this.logger.log('Running membership expiration email job...');

    try {
      const em = this.em.fork();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dayOffset = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d;
      };

      // Active-side reminders
      for (const days of [30, 14, 7, 1] as const) {
        await this.sendExpiringWarnings(em, dayOffset(days), days);
      }

      // Expired-side reminders (token-gated, public renewal link)
      for (const daysPast of [1, 7, 14, 30] as const) {
        await this.sendExpiredNotifications(em, dayOffset(-daysPast), daysPast);
      }

      this.logger.log('Membership expiration email job completed');
    } catch (error) {
      this.logger.error('Error running membership expiration email job:', error);
    }
  }

  /**
   * True when this membership row has been SUPERSEDED by a newer paid term for
   * the same user — i.e. the member already renewed. Renewals create a brand-new
   * Membership row (see PaymentFulfillmentService.fulfillMembershipPayment →
   * createMembership); the prior term's row is left `paid` with a now-past
   * endDate. Because the expiration crons evaluate membership rows individually,
   * that stale row keeps matching the +1/+7/+14/+30 expired cadence and emails an
   * already-renewed member "your membership has expired." Skipping superseded
   * rows fixes that for every renewer. (Surfaced by Sierra Quick / MECA-20260609-0005.)
   */
  private async isSupersededByNewerMembership(em: EntityManager, membership: Membership): Promise<boolean> {
    const userId = membership.user?.id;
    if (!userId || !membership.endDate) return false;
    const newer = await em.findOne(Membership, {
      user: userId,
      id: { $ne: membership.id },
      paymentStatus: PaymentStatus.PAID,
      cancelledAt: null,
      endDate: { $gt: membership.endDate },
    });
    return !!newer;
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

      // Skip rows the member has already renewed past — a newer paid term exists.
      if (await this.isSupersededByNewerMembership(em, membership)) {
        this.logger.log(`Skipping ${daysRemaining}-day expiration email for ${membership.id} — superseded by a newer paid membership (already renewed)`);
        continue;
      }

      // Skip comp members — they have a free_period covering the gap and
      // shouldn't receive renewal nag emails. The dedicated comp-end
      // reminder cron handles their cadence separately.
      const freePeriod = await this.compsService.getActiveFreePeriod(membership.id);
      if (freePeriod) {
        this.logger.log(`Skipping ${daysRemaining}-day expiration email for ${membership.id} — active free_period comp covers this period`);
        continue;
      }

      try {
        const frontendUrl = (process.env.FRONTEND_URL || 'https://www.mecacaraudio.com').replace(/\/+$/, '');
        const renewalUrl = `${frontendUrl}/membership/checkout/${membership.id}`;
        await this.emailService.sendMembershipExpiringEmail({
          to: membership.user.email,
          firstName: membership.user.first_name || undefined,
          mecaId: membership.mecaId || 0,
          membershipType: membership.membershipTypeConfig?.name || 'Membership',
          expiryDate: membership.endDate!,
          daysRemaining,
          renewalUrl,
        });
        this.logger.log(`Sent ${daysRemaining}-day expiration warning to ${membership.user.email}`);

        if (membership.user?.id) {
          await this.notificationsService.createForUser({
            userId: membership.user.id,
            title: `Membership expires in ${daysRemaining} days`,
            message: `Your ${membership.membershipTypeConfig?.name || 'membership'} expires on ${new Date(membership.endDate!).toLocaleDateString()}. Renew now to keep your benefits.`,
            type: 'alert',
            link: `/membership/checkout/${membership.id}`,
          });
        }
      } catch (error) {
        this.logger.error(`Failed to send expiration email to ${membership.user.email}:`, error);
      }
    }
  }

  private async sendExpiredNotifications(em: EntityManager, targetDate: Date, daysPast: number) {
    // Memberships that expired on the target date (i.e., today's run for the
    // matching +N day offset).
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const memberships = await em.find(
      Membership,
      {
        endDate: { $gte: startOfDay, $lte: endOfDay },
        paymentStatus: PaymentStatus.PAID,
        $or: [
          { stripeSubscriptionId: null },
          { cancelAtPeriodEnd: true },
        ],
      },
      {
        populate: ['user', 'membershipTypeConfig'],
      },
    );

    this.logger.log(`Found ${memberships.length} memberships expired +${daysPast}d (excluding active auto-renewals)`);

    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.mecacaraudio.com').replace(/\/+$/, '');

    for (const membership of memberships) {
      if (!membership.user?.email) {
        this.logger.warn(`Skipping membership ${membership.id} - no email address`);
        continue;
      }

      // Skip rows the member has already renewed past — a newer paid term exists.
      if (await this.isSupersededByNewerMembership(em, membership)) {
        this.logger.log(`Skipping +${daysPast}d expired email for ${membership.id} — superseded by a newer paid membership (already renewed)`);
        continue;
      }

      // Skip comp members — they have a free period covering the gap.
      const freePeriod = await this.compsService.getActiveFreePeriod(membership.id);
      if (freePeriod) {
        this.logger.log(`Skipping +${daysPast}d expired email for ${membership.id} — comp free_period active`);
        continue;
      }

      try {
        const tokenRow = await this.renewalTokenService.issueToken(membership.id);
        const renewalUrl = `${frontendUrl}/renew/${tokenRow.token}`;

        await this.emailService.sendMembershipExpiredEmail({
          to: membership.user.email,
          firstName: membership.user.first_name || undefined,
          mecaId: membership.mecaId || 0,
          membershipType: membership.membershipTypeConfig?.name || 'Membership',
          expiredDate: membership.endDate!,
          renewalUrl,
        });
        this.logger.log(`Sent +${daysPast}d expired email to ${membership.user.email}`);

        if (membership.user?.id) {
          await this.notificationsService.createForUser({
            userId: membership.user.id,
            title: `Your MECA membership has expired`,
            message: `Your ${membership.membershipTypeConfig?.name || 'membership'} expired on ${new Date(membership.endDate!).toLocaleDateString()}. Renew now to restore access.`,
            type: 'alert',
            link: `/renew/${tokenRow.token}`,
          });
        }
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

        if (registration.user?.id) {
          await this.notificationsService.createForUser({
            userId: registration.user.id,
            title: `Reminder: ${event.title} is tomorrow`,
            message: `Don't forget — ${event.title} starts ${new Date(event.eventDate).toLocaleDateString()}. Your check-in code is ${registration.checkInCode || 'TBD'}.`,
            type: 'info',
            link: `/events/${event.id}`,
          });
        }
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
        if (registration.user?.id) {
          await this.notificationsService.createForUser({
            userId: registration.user.id,
            title: `${event.title} is coming up`,
            message: `You showed interest in ${event.title} on ${new Date(event.eventDate).toLocaleDateString()}. Register now to compete.`,
            type: 'info',
            link: `/events/${event.id}`,
          });
        }
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
  // MEMBERSHIP COMP EXPIRY
  // Runs daily at 2:00 AM. Flips status on comps whose ends_at has passed
  // (status → expired_unused if uses_remaining > 0, else consumed).
  // =============================================================================
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpireDueComps() {
    this.logger.log('Running comp expiry sweep...');
    try {
      const result = await this.compsService.expireDueComps();
      this.logger.log(`Comp expiry sweep complete: ${result.expired} comp(s) expired.`);
    } catch (error) {
      this.logger.error('Error running comp expiry sweep:', error);
    }
  }

  // =============================================================================
  // MEMBERSHIP COMP RENEWAL (auto-extend + $0 invoice)
  // Runs daily at 2:30 AM. For memberships with active free_period comp
  // whose endDate is approaching, auto-extends and generates $0 Order +
  // Invoice tagged "Comp" so the renewal still shows in revenue reports.
  // =============================================================================
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCompRenewals() {
    this.logger.log('Running comp-renewal generation...');
    try {
      const result = await this.compsService.processCompRenewals();
      this.logger.log(
        `Comp renewals processed: generated=${result.generated}, skipped=${result.skipped}, errors=${result.errors}`,
      );
    } catch (error) {
      this.logger.error('Error running comp-renewal generation:', error);
    }
  }

  // =============================================================================
  // ABANDONED SHOP ORDER CLEANUP
  // Runs daily at 3:00 AM. Cancels any shop order that's been PENDING for
  // more than 24 hours. The Stripe payment intent has expired by then,
  // so the row is dead — cancelling preserves the audit trail without
  // cluttering the admin shop orders list with abandoned checkouts.
  // =============================================================================
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleAbandonedShopOrders() {
    this.logger.log('Running abandoned shop-order cleanup job...');
    try {
      const result = await this.shopService.cancelAbandonedPendingOrders(24);
      this.logger.log(
        `Abandoned shop-order cleanup completed: cancelled ${result.cancelled} order(s).`,
      );
    } catch (error) {
      this.logger.error('Error running abandoned shop-order cleanup job:', error);
    }
  }

  // =============================================================================
  // RECURRING INVOICE GENERATION
  // Runs daily at 7:00 AM. Materializes invoices from active templates whose
  // next_run_date is today or earlier. Each successful run advances the
  // template's next_run_date by its frequency (monthly/quarterly/annual).
  // =============================================================================
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async handleRecurringInvoiceGeneration() {
    this.logger.log('Running recurring invoice generation job...');
    try {
      const result = await this.recurringInvoicesService.processDueTemplates();
      this.logger.log(
        `Recurring invoice job completed: generated=${result.generated}, failed=${result.failed}`,
      );
    } catch (error) {
      this.logger.error('Error running recurring invoice generation job:', error);
    }
  }

  // =============================================================================
  // INVOICE PAYMENT REMINDERS
  // Runs daily at 9:30 AM. Sends "due in 3 days" reminders and overdue
  // reminders at day 1, 7, 14, 30 since due date. De-duplicated via the
  // invoices.last_reminder_sent_at column so re-running is safe.
  // =============================================================================
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleInvoicePaymentReminders() {
    this.logger.log('Running invoice payment-reminder job...');
    try {
      const result = await this.invoicesService.sendInvoiceReminders();
      this.logger.log(
        `Invoice reminder job completed: sent=${result.sent}, skipped=${result.skipped}`,
      );
    } catch (error) {
      this.logger.error('Error running invoice reminder job:', error);
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

          // Skip user in-app when their main membership was cancelled — they can no longer log in.
          if (invoice.user?.id && !membershipCancelled) {
            await this.notificationsService.createForUser({
              userId: invoice.user.id,
              title: `Invoice ${invoice.invoiceNumber} cancelled`,
              message: `Your invoice has been automatically cancelled because it remained unpaid past the due date.`,
              type: 'alert',
              link: `/billing/invoice/${invoice.id}`,
            });
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
   * Production migration helper — issues a renewal token + sends the
   * tokenized renewal email to EVERY currently-expired member regardless
   * of how long ago they expired. Bridges the gap between the new hard
   * expired-login gate going live and the next +1 day cron run.
   *
   * Skips auto-renewal subscribers and members inside an active comp
   * free_period (same exemptions as the normal cron).
   */
  async triggerRenewalBackfillForExpired(): Promise<{ success: boolean; processed: number; sent: number; skipped: number }> {
    const em = this.em.fork();
    const expired = await em.find(
      Membership,
      {
        endDate: { $lt: new Date() },
        paymentStatus: PaymentStatus.PAID,
        $or: [{ stripeSubscriptionId: null }, { cancelAtPeriodEnd: true }],
      },
      { populate: ['user', 'membershipTypeConfig'] },
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.mecacaraudio.com').replace(/\/+$/, '');
    let sent = 0;
    let skipped = 0;

    for (const m of expired) {
      if (!m.user?.email) {
        skipped++;
        continue;
      }
      if (await this.isSupersededByNewerMembership(em, m)) {
        skipped++;
        continue;
      }
      const comp = await this.compsService.getActiveFreePeriod(m.id);
      if (comp) {
        skipped++;
        continue;
      }
      try {
        const tokenRow = await this.renewalTokenService.issueToken(m.id);
        const renewalUrl = `${frontendUrl}/renew/${tokenRow.token}`;
        await this.emailService.sendMembershipExpiredEmail({
          to: m.user.email,
          firstName: m.user.first_name || undefined,
          mecaId: m.mecaId || 0,
          membershipType: m.membershipTypeConfig?.name || 'Membership',
          expiredDate: m.endDate!,
          renewalUrl,
        });
        sent++;
      } catch (err) {
        this.logger.error(`Backfill failed for ${m.user.email}: ${err}`);
        skipped++;
      }
    }

    this.logger.log(`Renewal backfill complete — processed: ${expired.length}, sent: ${sent}, skipped: ${skipped}`);
    return { success: true, processed: expired.length, sent, skipped };
  }

  /**
   * Send a test email to verify email configuration (for testing)
   */
  async sendTestEmail(toEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      const testBody = `
        <p style="margin:0 0 16px 0;">This is a test email to verify your email configuration is working correctly.</p>
        <p style="margin:0 0 16px 0;">If you received this email, your email settings are configured properly!</p>
        <p style="color:#64748b;font-size:12px;margin:0;">
          Sent at: ${new Date().toISOString()}<br>
          Provider: ${this.emailService.getProvider() || 'Not configured'}
        </p>`;
      const result = await this.emailService.sendEmail({
        to: toEmail,
        subject: 'MECA Test Email',
        from: 'noreply@mecacaraudio.com',
        html: this.emailService.buildBrandedHtml('Test Email', testBody, {
          preheader: 'MECA email configuration test',
        }),
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

  // =============================================================================
  // AUDIT LOG ROTATION
  // Runs daily at 3:00 AM - deletes old audit log entries
  // =============================================================================

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleLogRotation() {
    this.logger.log('Running audit log rotation job...');

    try {
      // Read retention days from site settings (default 180)
      const setting = await this.siteSettingsService.findByKey('audit_log_retention_days');
      const retentionDays = setting ? parseInt(setting.setting_value, 10) : 180;

      if (retentionDays <= 0) {
        this.logger.log('Log rotation disabled (retention days is 0 or negative)');
        return;
      }

      // Rotate login audit log
      const loginDeleted = await this.userActivityService.rotateLoginAuditLog(retentionDays);
      this.logger.log(`Deleted ${loginDeleted} login audit log entries older than ${retentionDays} days`);

      // Rotate admin audit log
      const adminDeleted = await this.userActivityService.rotateAdminAuditLog(retentionDays);
      this.logger.log(`Deleted ${adminDeleted} admin audit log entries older than ${retentionDays} days`);

      // Mark orphaned sessions as expired
      const orphaned = await this.userActivityService.markOrphanedSessions();
      this.logger.log(`Marked ${orphaned} orphaned sessions as session_expired`);

      this.logger.log('Audit log rotation job completed');
    } catch (error) {
      this.logger.error('Error running audit log rotation job:', error);
    }
  }

  // =============================================================================
  // BRUTE FORCE DETECTION
  // Runs every 15 minutes - alerts admins about suspicious login activity
  // =============================================================================

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleBruteForceDetection() {
    try {
      const { byEmail, byIp } = await this.userActivityService.getBruteForceAttempts(15, 5);

      if (byEmail.length === 0 && byIp.length === 0) return;

      this.logger.warn(
        `Brute force detection: ${byEmail.length} emails and ${byIp.length} IPs with 5+ failed attempts in last 15 minutes`,
      );

      // Build alert email
      const emailLines = byEmail.map(e => `${e.email}: ${e.count} attempts`).join('<br>');
      const ipLines = byIp.map(e => `${e.ip_address}: ${e.count} attempts`).join('<br>');

      const alertBody = `
          <p style="margin:0 0 16px 0;">The following accounts/IPs have had 5+ failed login attempts in the last 15 minutes:</p>
          ${byEmail.length > 0 ? `<h3 style="margin:0 0 6px 0;">By Email:</h3><p style="margin:0 0 16px 0;">${emailLines}</p>` : ''}
          ${byIp.length > 0 ? `<h3 style="margin:0 0 6px 0;">By IP Address:</h3><p style="margin:0 0 16px 0;">${ipLines}</p>` : ''}
          <p style="color: #64748b; font-size: 12px; margin:0;">
            This is an automated alert from the MECA login monitoring system.<br>
            Time: ${new Date().toISOString()}
          </p>`;
      const html = this.emailService.buildBrandedHtml('Security Alert', alertBody, {
        subtitle: 'Suspicious Login Activity',
        preheader: 'Suspicious login activity detected on MECA',
      });

      // Get admin email from site settings or use default
      const adminEmailSetting = await this.siteSettingsService.findByKey('admin_alert_email');
      const adminEmail = adminEmailSetting?.setting_value || 'admin@mecacaraudio.com';

      await this.emailService.sendEmail({
        to: adminEmail,
        subject: 'MECA Security Alert: Suspicious Login Activity',
        html,
        text: `Security Alert: ${byEmail.length} emails and ${byIp.length} IPs with 5+ failed login attempts in the last 15 minutes.`,
      });

      this.logger.log(`Brute force alert email sent to ${adminEmail}`);
    } catch (error) {
      this.logger.error('Error running brute force detection:', error);
    }
  }

  /**
   * Discard abandoned paid pre-registrations — rows still AWAITING_PAYMENT
   * (checkout started, never paid) older than 2 hours. A confirmed payment
   * flips the row to CONFIRMED long before this runs, so only truly abandoned
   * checkouts are removed — making "nothing left behind" true.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleAbandonedAwaitingPaymentCleanup() {
    try {
      const em = this.em.fork();
      const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
      // Guard against a stale shared build resolving the enum to undefined.
      const awaiting = RegistrationStatus.AWAITING_PAYMENT ?? 'awaiting_payment';
      const stale = await em.find(EventRegistration, {
        registrationStatus: awaiting as any,
        createdAt: { $lt: cutoff },
      });
      if (stale.length === 0) return;
      await em.removeAndFlush(stale);
      this.logger.log(`Discarded ${stale.length} abandoned awaiting-payment registration(s)`);
    } catch (error) {
      this.logger.error('Error cleaning up abandoned awaiting-payment registrations:', error);
    }
  }

  /**
   * Manually trigger log rotation (for testing)
   */
  async triggerLogRotation(): Promise<{ success: boolean; message: string }> {
    try {
      await this.handleLogRotation();
      return { success: true, message: 'Log rotation completed. Check server logs for details.' };
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }
}
