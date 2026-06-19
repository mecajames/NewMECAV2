import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import { TicketStatus } from '@newmeca/shared';
import { Ticket } from './ticket.entity';
import { TicketSettingsService } from './ticket-settings.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Auto-closes tickets that have gone stale waiting on the customer.
 *
 * Flow (driven by the `auto_close_inactive_days` setting, X):
 *   1. A ticket is OPEN/active (not resolved/closed/on_hold), staff replied
 *      last, and the customer hasn't replied in X days  → send a warning email
 *      ("…will automatically close within 24 hours") and stamp
 *      `auto_close_warning_at`.
 *   2. ~24h later, if the customer still hasn't replied (warning still set,
 *      staff still replied last) → close the ticket.
 *
 * Any non-internal reply (from either side) clears `auto_close_warning_at`
 * (see TicketsService.createComment / TicketGuestService.addGuestComment),
 * which restarts the clock. Setting X to 0 disables the whole feature.
 */
@Injectable()
export class TicketAutoCloseService {
  private readonly logger = new Logger(TicketAutoCloseService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly settingsService: TicketSettingsService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // SQL fragment: the latest non-internal comment (aliased `l`, author `p`) was
  // written by staff (is_staff / admin role), not a guest. Shared by both phases.
  private readonly staffRepliedLast =
    `(COALESCE(p.is_staff, false) = true OR p.role::text IN ('admin', 'super_admin'))
     AND COALESCE(l.is_guest_comment, false) = false AND l.author_id IS NOT NULL`;

  private get baseUrl(): string {
    return process.env.FRONTEND_URL || 'https://mecacaraudio.com';
  }

  // Hourly so the close fires close to the promised 24h after the warning, and
  // warnings go out promptly once a ticket crosses the inactivity threshold.
  // Cheap: warnings are stamped so they're emailed once, not every run.
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledRun(): Promise<void> {
    try {
      const { warned, closed } = await this.run();
      if (warned || closed) {
        this.logger.log(`Ticket inactivity sweep: warned ${warned}, closed ${closed}`);
      }
    } catch (err) {
      this.logger.error(`Ticket inactivity sweep failed: ${(err as Error).message}`);
    }
  }

  /**
   * Run both phases. Returns counts. Public so an admin endpoint could trigger
   * it on demand later. No-op when the setting is 0/unset (disabled).
   */
  async run(): Promise<{ warned: number; closed: number }> {
    // Per-ticket staff-set countdowns close independently of the global
    // inactivity setting (a separate feature, always active).
    const closedByTimer = await this.closeExpiredTimerTickets();

    const days = await this.settingsService.getNumber('auto_close_inactive_days', 0);
    if (!days || days <= 0) {
      return { warned: 0, closed: closedByTimer };
    }
    // Close already-warned tickets first, then warn newly-stale ones (a ticket
    // warned this run has warning_at = now, so it can't also be closed this run).
    const closed = await this.closeExpiredWarnedTickets();
    const warned = await this.warnStaleTickets(days);
    return { warned, closed: closed + closedByTimer };
  }

  /**
   * Phase 0 — close tickets whose staff-set per-reply countdown (auto_close_at)
   * has elapsed. auto_close_at is set only on a staff reply that chose a timer
   * and is cleared on any non-internal reply, so a non-null, expired value means
   * the customer never responded.
   */
  private async closeExpiredTimerTickets(): Promise<number> {
    const em = this.em.fork();
    const now = new Date();
    return em.nativeUpdate(
      Ticket,
      {
        autoCloseAt: { $lte: now },
        status: { $nin: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
      },
      {
        status: TicketStatus.CLOSED,
        closedAt: now,
        autoCloseAt: null,
        autoCloseWarningAt: null,
        updatedAt: now,
      },
    );
  }

  /** Phase 1 — email a 24h warning for tickets stale X days, stamp warning_at. */
  private async warnStaleTickets(days: number): Promise<number> {
    const em = this.em.fork();
    const conn = em.getConnection();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await conn.execute<any[]>(
      `SELECT t.id, t.ticket_number, t.title, t.reporter_id, t.guest_email, t.guest_name, t.access_token,
              rp.email AS reporter_email, rp.first_name AS reporter_first_name
       FROM public.tickets t
       LEFT JOIN LATERAL (
         SELECT author_id, is_guest_comment, created_at
         FROM public.ticket_comments
         WHERE ticket_id = t.id AND COALESCE(is_internal, false) = false
         ORDER BY created_at DESC LIMIT 1
       ) l ON true
       LEFT JOIN public.profiles p ON p.id = l.author_id
       LEFT JOIN public.profiles rp ON rp.id = t.reporter_id
       WHERE t.status NOT IN ('resolved', 'closed', 'on_hold', 'escalated', 'pending_internal_review')
         AND t.auto_close_warning_at IS NULL
         AND l.created_at <= ?
         AND ${this.staffRepliedLast}`,
      [cutoff.toISOString()],
    );

    let warned = 0;
    const now = new Date();
    for (const row of rows) {
      const to: string | null = row.reporter_email || row.guest_email || null;
      const viewUrl = this.buildViewUrl(row);
      // Can't reach the submitter → don't start the 24h close clock without a
      // warning. Left unstamped so it's re-evaluated on the next run.
      if (!to || !viewUrl) continue;

      try {
        await this.emailService.sendTicketAutoCloseWarningEmail({
          to,
          firstName: row.reporter_first_name || row.guest_name || undefined,
          ticketNumber: row.ticket_number,
          ticketTitle: row.title,
          inactiveDays: days,
          viewTicketUrl: viewUrl,
        });

        // Bell notification for member reporters (guests have no account).
        if (row.reporter_id) {
          await this.notificationsService.createForUser({
            userId: row.reporter_id,
            title: `Ticket ${row.ticket_number} closing soon`,
            message: `Your ticket has been awaiting your reply for ${days} day${days === 1 ? '' : 's'} and will auto-close within 24 hours. Reply to keep it open.`,
            type: 'alert',
            link: `/tickets/${row.id}`,
          });
        }

        await em.nativeUpdate(Ticket, { id: row.id }, { autoCloseWarningAt: now, updatedAt: now });
        warned++;
      } catch (err) {
        this.logger.error(`Failed to warn stale ticket ${row.ticket_number}: ${(err as Error).message}`);
      }
    }
    return warned;
  }

  /** Phase 2 — close tickets whose 24h warning window has elapsed. */
  private async closeExpiredWarnedTickets(): Promise<number> {
    const em = this.em.fork();
    const conn = em.getConnection();
    const closeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await conn.execute<any[]>(
      `SELECT t.id
       FROM public.tickets t
       LEFT JOIN LATERAL (
         SELECT author_id, is_guest_comment, created_at
         FROM public.ticket_comments
         WHERE ticket_id = t.id AND COALESCE(is_internal, false) = false
         ORDER BY created_at DESC LIMIT 1
       ) l ON true
       LEFT JOIN public.profiles p ON p.id = l.author_id
       WHERE t.status NOT IN ('resolved', 'closed', 'on_hold', 'escalated', 'pending_internal_review')
         AND t.auto_close_warning_at IS NOT NULL
         AND t.auto_close_warning_at <= ?
         AND ${this.staffRepliedLast}`,
      [closeCutoff.toISOString()],
    );

    if (rows.length === 0) return 0;
    const ids = rows.map((r: any) => r.id);
    const now = new Date();
    await em.nativeUpdate(
      Ticket,
      { id: { $in: ids } },
      { status: TicketStatus.CLOSED, closedAt: now, autoCloseWarningAt: null, updatedAt: now },
    );
    return ids.length;
  }

  /** Member tickets link to the dashboard view; guests use their access token. */
  private buildViewUrl(row: any): string | null {
    if (row.reporter_id) return `${this.baseUrl}/tickets/${row.id}`;
    if (row.access_token) return `${this.baseUrl}/support/guest/ticket/${row.access_token}`;
    return null;
  }
}
