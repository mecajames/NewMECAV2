import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import { Ticket } from './ticket.entity';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Nag-email escalator for assigned-but-unanswered tickets (James's spec):
 *   - Ticket submitted/assigned → tech already gets the normal new-ticket /
 *     assignment email (TicketsService). That's email #1 and starts the clock.
 *   - 48h after that with no answer → first nag email.
 *   - Every 8h after the first nag → another nag, filling their inbox until
 *     they reply, resolve, close, or reassign the ticket. There is NO second
 *     48h stage.
 *   - When the MEMBER replies back to the tech (ball returns to staff), the
 *     tech gets a shorter 24h window before the first nag, then the same
 *     every-8h hammering.
 *
 * "Unanswered" = the ticket is in a waiting-on-staff status and the latest
 * non-internal comment is NOT from staff (or there are no comments at all).
 * Replying, resolving, closing, putting on hold, or reassigning stops the
 * nags. Reminder emails are intentionally sent regardless of the staff
 * member's "receive email notifications" preference: overdue work is an
 * escalation, not a courtesy.
 */

// First nag after the initial new-ticket/assignment email.
const FIRST_NAG_HOURS = 48;
// First nag after a CUSTOMER follow-up put the ball back with staff.
const CUSTOMER_REPLY_NAG_HOURS = 24;
// Every subsequent nag.
const REPEAT_NAG_HOURS = 8;
const HOUR_MS = 60 * 60 * 1000;

// Statuses where the ball is with staff. awaiting_response = staff already
// answered (waiting on customer); on_hold = intentional pause; resolved/closed
// = done. None of those should nag.
const WAITING_ON_STAFF_STATUSES = [
  'open',
  'in_progress',
  'escalated',
  'reopened',
  'pending_internal_review',
];

@Injectable()
export class TicketAssigneeReminderService {
  private readonly logger = new Logger(TicketAssigneeReminderService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private get baseUrl(): string {
    return process.env.FRONTEND_URL || 'https://mecacaraudio.com';
  }

  // 10-minute sweep so each nag fires within minutes of its exact 48h/24h/8h
  // mark — never early (the >= threshold checks guarantee that), and at most
  // ~10 minutes late. Each nag is stamped (count + reminded_at) so it sends
  // exactly once, and the 8h cadence measures from the previous nag's stamp.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledRun(): Promise<void> {
    try {
      const sent = await this.run();
      if (sent) {
        this.logger.log(`Assignee reminder sweep: sent ${sent} nag email(s)`);
      }
    } catch (err) {
      this.logger.error(`Assignee reminder sweep failed: ${(err as Error).message}`);
    }
  }

  /** Public so an admin endpoint could trigger it on demand later. */
  async run(): Promise<number> {
    const em = this.em.fork();
    const conn = em.getConnection();
    const now = new Date();

    // Candidates: assigned, waiting on staff, and the latest non-internal
    // comment (if any) was NOT written by staff — i.e. nobody has answered.
    const rows = await conn.execute<any[]>(
      `SELECT t.id, t.ticket_number, t.title, t.assigned_at,
              t.assignee_reminder_count, t.assignee_reminded_at,
              ap.id AS assignee_id, ap.email AS assignee_email, ap.first_name AS assignee_first_name,
              l.created_at AS last_comment_at
       FROM public.tickets t
       JOIN public.profiles ap ON ap.id = t.assigned_to_id
       LEFT JOIN LATERAL (
         SELECT author_id, is_guest_comment, created_at
         FROM public.ticket_comments
         WHERE ticket_id = t.id AND COALESCE(is_internal, false) = false
         ORDER BY created_at DESC LIMIT 1
       ) l ON true
       LEFT JOIN public.profiles p ON p.id = l.author_id
       WHERE t.assigned_to_id IS NOT NULL
         AND t.assigned_at IS NOT NULL
         AND t.status IN (${WAITING_ON_STAFF_STATUSES.map(() => '?').join(', ')})
         AND NOT (
           l.author_id IS NOT NULL
           AND COALESCE(l.is_guest_comment, false) = false
           AND (COALESCE(p.is_staff, false) = true OR p.role::text IN ('admin', 'super_admin'))
         )`,
      WAITING_ON_STAFF_STATUSES,
    );

    let sent = 0;
    for (const row of rows) {
      try {
        const assignedAt = new Date(row.assigned_at);
        const lastCommentAt = row.last_comment_at ? new Date(row.last_comment_at) : null;
        // Clock anchor: assignment, or the customer's newer follow-up message.
        // A customer follow-up gets the shorter 24h window (they're actively
        // waiting on us); a fresh assignment gets 48h.
        const isCustomerReplyAnchor = !!lastCommentAt && lastCommentAt > assignedAt;
        const anchor = isCustomerReplyAnchor ? lastCommentAt! : assignedAt;
        const firstNagHours = isCustomerReplyAnchor ? CUSTOMER_REPLY_NAG_HOURS : FIRST_NAG_HOURS;
        const remindedAt = row.assignee_reminded_at ? new Date(row.assignee_reminded_at) : null;

        // Newer customer activity (or a fresh cycle) since the last nag →
        // start over at reminder #1 with a fresh window.
        const count: number =
          remindedAt && anchor > remindedAt ? 0 : row.assignee_reminder_count || 0;

        const idleMs = now.getTime() - anchor.getTime();
        const due =
          count === 0
            ? idleMs >= firstNagHours * HOUR_MS
            : !!remindedAt && now.getTime() - remindedAt.getTime() >= REPEAT_NAG_HOURS * HOUR_MS;

        if (!due) {
          // Persist a cycle reset so the stored count matches reality.
          if (count !== (row.assignee_reminder_count || 0)) {
            await em.nativeUpdate(Ticket, { id: row.id }, {
              assigneeReminderCount: 0,
              assigneeRemindedAt: null,
            } as any);
          }
          continue;
        }

        if (!row.assignee_email) continue;

        await this.sendNagEmail(row, count, idleMs);

        // Bell notification on the first nag of a cycle only — the emails
        // repeat every 8h, the bell doesn't need to.
        if (count === 0) {
          await this.notificationsService.createForUser({
            userId: row.assignee_id,
            title: `Ticket ${row.ticket_number} needs your reply`,
            message: `Assigned to you ${Math.floor(idleMs / (24 * HOUR_MS))}+ days ago and still unanswered.`,
            type: 'alert',
            link: `/admin/tickets/${row.id}`,
          });
        }

        await em.nativeUpdate(Ticket, { id: row.id }, {
          assigneeReminderCount: count + 1,
          assigneeRemindedAt: now,
        } as any);
        sent++;
      } catch (err) {
        this.logger.error(
          `Failed to nag assignee for ticket ${row.ticket_number}: ${(err as Error).message}`,
        );
      }
    }
    return sent;
  }

  private async sendNagEmail(row: any, count: number, idleMs: number): Promise<void> {
    const viewUrl = `${this.baseUrl}/admin/tickets/${row.id}`;
    const greeting = row.assignee_first_name ? `Hi ${row.assignee_first_name},` : 'Hi,';
    const idleHours = Math.floor(idleMs / HOUR_MS);
    const idleLabel =
      idleHours >= 48 ? `${Math.floor(idleHours / 24)} days` : `${idleHours} hours`;

    const isFirst = count === 0;
    const title = isFirst ? 'Ticket Waiting for Your Reply' : 'Ticket STILL Unanswered';
    const subject = isFirst
      ? `Reminder: ticket ${row.ticket_number} is waiting for your reply`
      : `Still unanswered: ticket ${row.ticket_number} needs your attention`;
    const lead = isFirst
      ? `Support ticket <strong>${row.ticket_number}</strong> is assigned to you and hasn't been answered in <strong>${idleLabel}</strong>. From here, this reminder repeats every ${REPEAT_NAG_HOURS} hours until the ticket is handled:`
      : `Support ticket <strong>${row.ticket_number}</strong> is assigned to you and has now gone <strong>${idleLabel}</strong> without an answer. This reminder repeats every ${REPEAT_NAG_HOURS} hours until the ticket is handled:`;

    const body = `
      <p style="margin:0 0 16px 0;">${greeting}</p>
      <p style="margin:0 0 16px 0;">${lead}</p>
      <p style="margin:0 0 24px 0; padding:12px 16px; background:#f1f5f9; border-left:4px solid #ea580c; border-radius:4px;"><strong>${row.title}</strong></p>
      <p style="margin:0 0 16px 0;">Please reply to the member, or resolve/close/reassign the ticket if it's already handled — any of those stops these reminders.</p>
      <p style="margin:0 0 24px 0;"><a href="${viewUrl}" style="display:inline-block; background:#ea580c; color:#ffffff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">Open Ticket</a></p>
    `;
    const html = this.emailService.buildBrandedHtml(title, body, {
      preheader: `${row.ticket_number} unanswered for ${idleLabel}`,
    });
    await this.emailService.sendEmail({
      to: row.assignee_email,
      subject,
      html,
      text: `${greeting}\n\nTicket ${row.ticket_number} ("${row.title}") is assigned to you and has been unanswered for ${idleLabel}. Reply to the member, or resolve/close/reassign it.\n\n${viewUrl}`,
    });
  }
}
