import { Injectable, Inject, NotFoundException, ForbiddenException, forwardRef, Logger } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { sanitizeSignatureHtml } from './staff-signatures.service';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketDepartment as TicketDepartmentEntity } from './entities/ticket-department.entity';
import { TicketStaffDepartment } from './entities/ticket-staff-department.entity';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { Membership } from '../memberships/memberships.entity';
import { LoginAuditLog } from '../user-activity/login-audit-log.entity';
import { Judge } from '../judges/judge.entity';
import { EventDirector } from '../event-directors/event-director.entity';
import { RetailerListing } from '../business-listings/retailer-listing.entity';
import { ManufacturerListing } from '../business-listings/manufacturer-listing.entity';
import { TeamMember } from '../teams/team-member.entity';
import { Team } from '../teams/team.entity';
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketDepartment,
  TICKET_STATUS_TRANSITIONS,
  CreateTicketDto,
  UpdateTicketDto,
  CreateTicketCommentDto,
  UpdateTicketCommentDto,
  CreateTicketAttachmentDto,
  TicketListQuery,
} from '@newmeca/shared';
import { BadRequestException } from '@nestjs/common';
import { TicketRoutingService } from './ticket-routing.service';
import { TicketStaffService } from './ticket-staff.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { StaffSignaturesService } from './staff-signatures.service';
import { TicketCustomFieldsService } from './ticket-custom-fields.service';

/**
 * Statuses that mean nobody is actively expected to reply.
 * - resolved/closed: ticket lifecycle ended.
 * - on_hold: intentionally paused, neither party is on the hook.
 */
const TERMINAL_OR_PAUSED_STATUSES: ReadonlySet<string> = new Set([
  'resolved', 'closed', 'on_hold',
]);

/**
 * Single source of truth for the derived "waiting on" enum. The
 * frontend, the system-filters service, and the server-side filter
 * compute all converge on this rule:
 *
 *   - 'nobody'    : status is terminal (resolved/closed) or paused (on_hold)
 *   - 'customer'  : staff replied last, OR status is the explicit
 *                   awaiting_response bucket
 *   - 'staff'     : everything else (no reply yet, or customer/guest
 *                   replied last on a non-terminal ticket)
 */
export function deriveWaitingOn(
  status: string,
  lastReplyAuthorKind?: 'staff' | 'customer' | 'system' | 'guest' | null,
): 'customer' | 'staff' | 'nobody' {
  if (TERMINAL_OR_PAUSED_STATUSES.has(status)) return 'nobody';
  if (status === 'awaiting_response') return 'customer';
  if (lastReplyAuthorKind === 'staff') return 'customer';
  return 'staff';
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly frontendUrl = process.env.FRONTEND_URL || 'https://mecacaraudio.com';

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    @Inject(forwardRef(() => TicketRoutingService))
    private readonly routingService: TicketRoutingService,
    @Inject(forwardRef(() => TicketStaffService))
    private readonly staffService: TicketStaffService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly signaturesService: StaffSignaturesService,
    private readonly customFieldsService: TicketCustomFieldsService,
  ) {}

  // ==========================================================================
  // Ticket Operations
  // ==========================================================================

  async findAll(query: TicketListQuery): Promise<{ data: Ticket[]; total: number }> {
    const em = this.em.fork();
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      department,
      department_id,
      reporter_id,
      assigned_to_id,
      event_id,
      search,
      last_reply_by,
      waiting_on,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query as TicketListQuery & { department_id?: string; waiting_on?: 'customer' | 'staff' | 'nobody' };

    const offset = (page - 1) * limit;

    // Build conditions into an array of sub-clauses, then combine into
    // either a flat object (single condition) or a $and (multiple), so
    // sub-clauses that use $or (assignee with unassigned-sentinel,
    // search title/description) don't clobber each other. Previously
    // two consecutive `where.$or = ...` assignments were dropping the
    // earlier one and producing invalid SQL.
    const andClauses: any[] = [];

    // Helper: split a single-value-or-comma-separated-string into a
    // normalized array. Returns [] for empty/undefined so the caller can
    // skip the clause entirely. Used by every multi-select filter
    // (status / priority / department / assigned_to_id).
    const splitCsv = (v: unknown): string[] => {
      if (v === undefined || v === null || v === '') return [];
      if (Array.isArray(v)) return v.map(String).filter(Boolean);
      return String(v).split(',').map(s => s.trim()).filter(Boolean);
    };

    // 'active' is a synthetic status group meaning "anything that still
    // needs admin attention". Expanded to every non-terminal status.
    // Coexists with multi-select: passing 'active' alone preserves legacy
    // behavior; passing a list (e.g. 'open,in_progress') uses $in.
    if (status === 'active' as any) {
      andClauses.push({ status: { $in: ['open', 'in_progress', 'awaiting_response', 'pending_internal_review', 'escalated', 'on_hold', 'reopened'] } });
    } else {
      const statuses = splitCsv(status);
      if (statuses.length === 1) andClauses.push({ status: statuses[0] });
      else if (statuses.length > 1) andClauses.push({ status: { $in: statuses } });
    }

    const priorities = splitCsv(priority);
    if (priorities.length === 1) andClauses.push({ priority: priorities[0] });
    else if (priorities.length > 1) andClauses.push({ priority: { $in: priorities } });

    if (category) andClauses.push({ category });

    // Support both legacy department enum and new department_id FK.
    // department_id is single (it's a UUID picker); department supports
    // multi-select since it's a legacy enum bucket.
    if (department_id) {
      andClauses.push({ departmentEntity: department_id });
    } else {
      const departments = splitCsv(department);
      if (departments.length === 1) andClauses.push({ department: departments[0] });
      else if (departments.length > 1) andClauses.push({ department: { $in: departments } });
    }

    if (reporter_id) andClauses.push({ reporter: reporter_id });

    // assigned_to_id supports multi-select PLUS the sentinel 'null' /
    // 'unassigned' to mean "tickets with no assignee". Mixing the sentinel
    // with UUIDs produces an OR sub-clause ("unassigned tickets OR
    // tickets assigned to user X / Y / …"), nested inside the $and so it
    // composes safely with the other filters.
    const assignees = splitCsv(assigned_to_id);
    if (assignees.length > 0) {
      const wantsUnassigned = assignees.some(a => a === 'null' || a === 'unassigned');
      const userIds = assignees.filter(a => a !== 'null' && a !== 'unassigned');
      if (wantsUnassigned && userIds.length === 0) {
        andClauses.push({ assignedTo: null });
      } else if (wantsUnassigned && userIds.length > 0) {
        andClauses.push({ $or: [{ assignedTo: null }, { assignedTo: { $in: userIds } }] });
      } else if (userIds.length === 1) {
        andClauses.push({ assignedTo: userIds[0] });
      } else {
        andClauses.push({ assignedTo: { $in: userIds } });
      }
    }

    if (event_id) andClauses.push({ event: event_id });

    if (search) {
      const like = `%${search}%`;
      const orClauses: any[] = [
        { title: { $ilike: like } },
        { description: { $ilike: like } },
        { ticketNumber: { $ilike: like } },
        // Guest-flow tickets carry the submitter's name/email on the ticket
        // itself (no linked profile), so match those directly too.
        { guestName: { $ilike: like } },
        { guestEmail: { $ilike: like } },
      ];
      // Also match the LINKED reporter by name / email / MECA ID. Resolved to
      // profile IDs via a pre-query (same approach as the last_reply_by /
      // waiting_on filters above) and folded in as a plain FK `$in` predicate
      // — so searching a member's name (or MECA ID / email) returns EVERY
      // ticket that member ever filed, not just ones whose title/body happens
      // to contain the term. Keeping it an FK column condition (rather than a
      // relation join inside the $or) avoids dropping guest tickets whose
      // reporter is null.
      const matchingProfileIds = await this.findProfileIdsBySearch(em, search);
      if (matchingProfileIds.length > 0) {
        orClauses.push({ reporter: { $in: matchingProfileIds } });
      }
      andClauses.push({ $or: orClauses });
    }

    // Last-reply-by filter. Resolved at the SQL level into a set of
    // matching ticket IDs which is then folded into the where as an
    // $in clause. Doing it as a pre-query keeps MikroORM's where
    // composable with the other filters and avoids correlated-
    // subquery gymnastics inside MikroORM's query builder.
    if (last_reply_by) {
      const eligibleIds = await this.computeTicketIdsByLastReplyKind(em, last_reply_by);
      if (eligibleIds.length === 0) {
        // No matches - short-circuit to an empty page rather than
        // running the main query with an empty $in (which would still
        // produce no results but burn the round-trip).
        return { data: [], total: 0 };
      }
      andClauses.push({ id: { $in: eligibleIds } });
    }

    // waiting_on filter. Derived enum: 'customer' = staff replied last
    // (or status explicitly set to awaiting_response); 'staff' = the
    // ball is in our court (no reply yet or customer replied last);
    // 'nobody' = ticket is resolved / closed / on_hold so no party
    // is actively expected to respond. Powers the standard system
    // filters (Awaiting My Reply, Awaiting Customer) without forcing
    // the frontend to compose status + last_reply combinations.
    if (waiting_on) {
      const eligibleIds = await this.computeTicketIdsByWaitingOn(em, waiting_on);
      if (eligibleIds.length === 0) return { data: [], total: 0 };
      andClauses.push({ id: { $in: eligibleIds } });
    }

    // Compose the final where. Empty → match everything. Single clause →
    // unwrap so we don't emit a redundant 1-element $and. Multiple → $and.
    const where: any =
      andClauses.length === 0 ? {} :
      andClauses.length === 1 ? andClauses[0] :
      { $and: andClauses };

    const orderBy: any = {};
    const sortField = sort_by === 'created_at' ? 'createdAt' :
                      sort_by === 'updated_at' ? 'updatedAt' :
                      sort_by;
    orderBy[sortField] = sort_order.toUpperCase();

    const [data, total] = await Promise.all([
      em.find(Ticket, where, {
        limit,
        offset,
        orderBy,
        populate: ['reporter', 'assignedTo', 'event', 'departmentEntity'],
      }),
      em.count(Ticket, where),
    ]);

    // Stitch on per-ticket last-reply summary AND derived waiting_on.
    // We compute these client-side rather than carrying them on the
    // Ticket entity so a ticket fetch that doesn't go through findAll
    // (e.g. detail page) isn't forced to populate comments.
    const lastReplyMap = await this.fetchLastRepliesForTickets(em, data.map((t) => t.id));
    const dataWithLastReply = data.map((t) => {
      const json = t.toJSON();
      const lastReply = lastReplyMap.get(t.id) || null;
      (json as any).last_reply = lastReply;
      (json as any).waiting_on = deriveWaitingOn(t.status, lastReply?.author_kind);
      return json;
    });

    return { data: dataWithLastReply as any, total };
  }

  /**
   * Resolve a free-text search term to the set of profile IDs whose name,
   * email, or MECA ID matches. Used by findAll() so a ticket search by a
   * member's name / email / MECA ID returns EVERY ticket that member filed
   * (matched on the reporter FK), not just ones whose title or body contains
   * the term. Matches first/last/full name so "John", "Smith", and
   * "John Smith" all resolve. Capped so a very broad term can't balloon the
   * follow-up `$in`.
   */
  private async findProfileIdsBySearch(em: EntityManager, search: string): Promise<string[]> {
    const conn = em.getConnection();
    const like = `%${search}%`;
    // NOTE: meca_id is a NUMERIC column in the DB (the entity decorator says
    // text, but the actual column is integer). `COALESCE(meca_id, '')` makes
    // Postgres try to coerce '' to integer → "invalid input syntax for type
    // integer" (22P02), which 500'd EVERY ticket search. Cast to text first.
    const rows = await conn.execute<any[]>(
      `SELECT id FROM public.profiles
       WHERE first_name ILIKE ?
          OR last_name ILIKE ?
          OR full_name ILIKE ?
          OR email ILIKE ?
          OR COALESCE(meca_id::text, '') ILIKE ?
       LIMIT 1000`,
      [like, like, like, like, like],
    );
    return rows.map((r: any) => r.id);
  }

  /**
   * The most recent tickets filed by the same person, newest first,
   * excluding the ticket currently being viewed. Matches BOTH the linked
   * profile (member tickets) AND the email (guest-flow tickets) so staff see
   * the full history regardless of how each ticket was submitted. Returns a
   * lightweight shape (id / number / subject / status / date) for the
   * "Recent tickets" list in the admin User Report panel.
   */
  private async findRecentTicketsForUser(
    em: EntityManager,
    profileId: string | null,
    email: string | null,
    excludeTicketId: string,
    limit: number,
  ): Promise<Array<{ id: string; ticket_number: string; title: string; status: string; created_at: string | null }>> {
    const identityClauses: any[] = [];
    if (profileId) identityClauses.push({ reporter: profileId });
    if (email) identityClauses.push({ guestEmail: email });
    if (identityClauses.length === 0) return [];

    const where: any = {
      $and: [
        { id: { $ne: excludeTicketId } },
        identityClauses.length === 1 ? identityClauses[0] : { $or: identityClauses },
      ],
    };

    const tickets = await em.find(Ticket, where, {
      orderBy: { createdAt: 'DESC' },
      limit,
    });

    return tickets.map((t) => ({
      id: t.id,
      ticket_number: t.ticketNumber,
      title: t.title,
      status: t.status,
      created_at: t.createdAt ? t.createdAt.toISOString() : null,
    }));
  }

  /**
   * Returns ticket IDs whose latest non-internal comment author matches
   * the requested kind. `staff` = admin/super_admin profile or
   * is_staff=true; `customer` = anyone else who posted (including
   * guests); `none` = tickets with zero non-internal comments. Run as
   * a single SQL statement so we can apply it as a pre-filter before
   * MikroORM builds the main query.
   */
  private async computeTicketIdsByLastReplyKind(
    em: EntityManager,
    kind: 'staff' | 'customer' | 'none',
  ): Promise<string[]> {
    const conn = em.getConnection();
    if (kind === 'none') {
      const rows = await conn.execute<any[]>(
        `SELECT t.id FROM public.tickets t
         WHERE NOT EXISTS (
           SELECT 1 FROM public.ticket_comments c
           WHERE c.ticket_id = t.id AND COALESCE(c.is_internal, false) = false
         )`,
      );
      return rows.map((r: any) => r.id);
    }
    // Cast role to text before comparing. profiles.role is a Postgres enum
    // (user_role) that does NOT contain 'super_admin'; comparing the enum
    // directly to that literal makes Postgres try to coerce it and throw
    // "invalid input value for enum user_role: super_admin", 500ing the whole
    // last_reply_by filter. Text comparison is safe regardless of enum values.
    const staffPredicate =
      `(COALESCE(p.is_staff, false) = true OR p.role::text IN ('admin', 'super_admin')) AND COALESCE(l.is_guest_comment, false) = false AND l.author_id IS NOT NULL`;
    const customerPredicate = `NOT (${staffPredicate})`;
    const predicate = kind === 'staff' ? staffPredicate : customerPredicate;
    const rows = await conn.execute<any[]>(
      `WITH latest AS (
         SELECT DISTINCT ON (ticket_id) ticket_id, author_id, is_guest_comment
         FROM public.ticket_comments
         WHERE COALESCE(is_internal, false) = false
         ORDER BY ticket_id, created_at DESC
       )
       SELECT l.ticket_id AS id
       FROM latest l
       LEFT JOIN public.profiles p ON p.id = l.author_id
       WHERE ${predicate}`,
    );
    return rows.map((r: any) => r.id);
  }

  /**
   * Returns ticket IDs whose derived `waiting_on` value matches the
   * requested bucket. Single SQL statement that joins to the latest
   * non-internal comment + the comment author's role so we can apply
   * it as a pre-filter alongside the rest of the where-clause.
   */
  private async computeTicketIdsByWaitingOn(
    em: EntityManager,
    kind: 'customer' | 'staff' | 'nobody',
  ): Promise<string[]> {
    const conn = em.getConnection();
    if (kind === 'nobody') {
      const rows = await conn.execute<any[]>(
        `SELECT t.id FROM public.tickets t
         WHERE t.status IN ('resolved', 'closed', 'on_hold')`,
      );
      return rows.map((r: any) => r.id);
    }
    // Build the join once. Distinguish the latest non-internal comment
    // per ticket; if none, the join is NULL and the author predicate
    // evaluates conservatively (we treat 'no reply yet' as waiting on
    // staff, matching the deriveWaitingOn helper).
    const staffPredicate =
      `(COALESCE(p.is_staff, false) = true OR p.role::text IN ('admin', 'super_admin'))
       AND COALESCE(l.is_guest_comment, false) = false AND l.author_id IS NOT NULL`;
    // 'customer' waiting_on means staff replied last OR status is
    // awaiting_response. 'staff' waiting_on means the inverse on a
    // non-terminal ticket.
    const sql =
      kind === 'customer'
        ? `SELECT t.id FROM public.tickets t
           LEFT JOIN LATERAL (
             SELECT author_id, is_guest_comment
             FROM public.ticket_comments
             WHERE ticket_id = t.id AND COALESCE(is_internal, false) = false
             ORDER BY created_at DESC LIMIT 1
           ) l ON true
           LEFT JOIN public.profiles p ON p.id = l.author_id
           WHERE t.status NOT IN ('resolved', 'closed', 'on_hold')
             AND (t.status = 'awaiting_response' OR ${staffPredicate})`
        : `SELECT t.id FROM public.tickets t
           LEFT JOIN LATERAL (
             SELECT author_id, is_guest_comment
             FROM public.ticket_comments
             WHERE ticket_id = t.id AND COALESCE(is_internal, false) = false
             ORDER BY created_at DESC LIMIT 1
           ) l ON true
           LEFT JOIN public.profiles p ON p.id = l.author_id
           WHERE t.status NOT IN ('resolved', 'closed', 'on_hold')
             AND t.status <> 'awaiting_response'
             AND (l.author_id IS NULL OR NOT (${staffPredicate}))`;
    const rows = await conn.execute<any[]>(sql);
    return rows.map((r: any) => r.id);
  }

  /**
   * Batch fetch the latest non-internal comment for each ticket in
   * `ticketIds` and return a Map keyed by ticket id. Used to decorate
   * findAll() responses without forcing each Ticket row to populate
   * its full comments collection.
   */
  private async fetchLastRepliesForTickets(
    em: EntityManager,
    ticketIds: string[],
  ): Promise<Map<string, {
    author_id: string | null;
    author_name: string;
    author_kind: 'staff' | 'customer' | 'system' | 'guest';
    created_at: string;
  }>> {
    const map = new Map<string, any>();
    if (ticketIds.length === 0) return map;
    const conn = em.getConnection();
    // Build IN-clause placeholders by hand. MikroORM's raw-SQL `?` binding
    // expands an array param into a comma list, so `ANY(?)` renders as
    // `ANY('id1', 'id2', ...)` — a Postgres syntax error that 500s the whole
    // list endpoint. The codebase-standard fix is one `?` per id with the ids
    // spread as scalar params (see getStaffRatings / project memory note).
    const inPlaceholders = ticketIds.map(() => '?').join(',');
    const rows = await conn.execute<any[]>(
      `WITH latest AS (
         SELECT DISTINCT ON (ticket_id)
           ticket_id, author_id, is_guest_comment, guest_author_name, created_at
         FROM public.ticket_comments
         WHERE COALESCE(is_internal, false) = false
         ORDER BY ticket_id, created_at DESC
       )
       SELECT
         l.ticket_id,
         l.author_id,
         l.is_guest_comment,
         l.guest_author_name,
         l.created_at,
         p.first_name,
         p.last_name,
         p.email,
         p.role,
         COALESCE(p.is_staff, false) AS is_staff
       FROM latest l
       LEFT JOIN public.profiles p ON p.id = l.author_id
       WHERE l.ticket_id IN (${inPlaceholders})`,
      ticketIds,
    );
    for (const r of rows) {
      const isStaffRole = r.is_staff === true || r.role === 'admin' || r.role === 'super_admin';
      let kind: 'staff' | 'customer' | 'system' | 'guest';
      if (r.is_guest_comment) kind = 'guest';
      else if (!r.author_id) kind = 'system';
      else if (isStaffRole) kind = 'staff';
      else kind = 'customer';

      const name = r.is_guest_comment
        ? r.guest_author_name || 'Guest'
        : (`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || 'Unknown');

      map.set(r.ticket_id, {
        author_id: r.author_id || null,
        author_name: name,
        author_kind: kind,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      });
    }
    return map;
  }

  async findById(id: string): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id }, {
      populate: ['reporter', 'assignedTo', 'event', 'departmentEntity'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    // Decorate with last_reply + derived waiting_on so the detail page
    // sees the same shape as the list page. Override toJSON so existing
    // callers (controller wraps with json automatically) get the
    // augmented object without each call site reimplementing it.
    const lastReplyMap = await this.fetchLastRepliesForTickets(em, [ticket.id]);
    const lastReply = lastReplyMap.get(ticket.id) || null;
    const waitingOn = deriveWaitingOn(ticket.status, lastReply?.author_kind);
    const originalToJSON = ticket.toJSON.bind(ticket);
    (ticket as any).toJSON = () => {
      const json = originalToJSON();
      (json as any).last_reply = lastReply;
      (json as any).waiting_on = waitingOn;
      return json;
    };
    return ticket;
  }

  /**
   * Aggregates everything a support admin needs to identify the reporter
   * at a glance: full profile, active memberships, role flags (judge / ED
   * / retailer / manufacturer / team membership). Used by the Details
   * panel on /admin/tickets/:id to surface MECA ID, expiration, and
   * business affiliations without forcing the admin to bounce between
   * pages.
   */
  async getReporterContext(ticketId: string): Promise<any> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id: ticketId }, { populate: ['reporter'] });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const reporter = ticket.reporter;
    if (!reporter) {
      return { profile: null, memberships: [], flags: null };
    }

    // Active memberships with type config so we can show the type name
    // and category alongside the expiration date.
    const memberships = await em.find(
      Membership,
      { user: reporter.id },
      { populate: ['membershipTypeConfig'], orderBy: { endDate: 'DESC' } },
    );

    // Resolve business roles in parallel.
    const [judgeRec, edRec, retailerCount, manufacturerCount, teamMemberships] = await Promise.all([
      em.findOne(Judge, { user: reporter.id }),
      em.findOne(EventDirector, { user: reporter.id }),
      em.count(RetailerListing, { user: reporter.id }),
      em.count(ManufacturerListing, { user: reporter.id }),
      em.find(TeamMember, { userId: reporter.id, status: 'active' }),
    ]);

    // Hydrate team names with a second cheap query (teamId is a raw column,
    // not a relation we can populate directly).
    const teamRows: { team_id: string; team_name: string; role: string }[] = [];
    if (teamMemberships.length > 0) {
      const teamIds = teamMemberships.map(tm => tm.teamId);
      const teams = await em.find(Team, { id: { $in: teamIds } });
      const teamById = new Map(teams.map(t => [t.id, t]));
      for (const tm of teamMemberships) {
        const t = teamById.get(tm.teamId);
        if (t) {
          teamRows.push({ team_id: t.id, team_name: (t as any).name, role: String(tm.role) });
        }
      }
    }

    return {
      profile: {
        id: reporter.id,
        meca_id: reporter.meca_id,
        first_name: reporter.first_name,
        last_name: reporter.last_name,
        full_name: `${reporter.first_name || ''} ${reporter.last_name || ''}`.trim() || reporter.email,
        email: reporter.email,
        phone: (reporter as any).phone || null,
        role: reporter.role,
        is_staff: (reporter as any).is_staff === true,
        account_type: (reporter as any).account_type,
        can_apply_judge: (reporter as any).can_apply_judge === true,
        can_apply_event_director: (reporter as any).can_apply_event_director === true,
        maintenance_login_allowed: (reporter as any).maintenance_login_allowed === true,
        login_banned: (reporter as any).login_banned === true,
      },
      memberships: memberships.map(m => ({
        id: m.id,
        type_name: m.membershipTypeConfig?.name || null,
        category: (m.membershipTypeConfig as any)?.category || null,
        payment_status: m.paymentStatus,
        end_date: m.endDate ? m.endDate.toISOString() : null,
        meca_id: (m as any).meca_id || null,
      })),
      flags: {
        is_judge: !!judgeRec && judgeRec.isActive === true,
        is_event_director: !!edRec && (edRec as any).isActive === true,
        is_retailer: retailerCount > 0,
        is_manufacturer: manufacturerCount > 0,
        teams: teamRows,
      },
    };
  }

  /**
   * Unified "User Report" for the admin ticket detail. Works for any submitter:
   * a logged-in member (reporter), an account-help linked member, an expired
   * member who used the guest flow (linked_profile_hint), or a true guest with
   * no account. Surfaces account/membership context, last login, and the
   * IP/user-agent captured when the ticket was submitted (staff-only).
   */
  async getTicketUserReport(ticketId: string): Promise<any> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id: ticketId }, { populate: ['reporter'] });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const reporter = ticket.reporter;
    const name = reporter
      ? (`${reporter.first_name || ''} ${reporter.last_name || ''}`.trim() || (reporter as any).full_name || reporter.email || null)
      : (ticket.guestName || null);
    const email = reporter ? (reporter.email || null) : (ticket.guestEmail || null);

    // Resolve the best-known profile: linked reporter → profile matching the
    // guest email → the staff-only linked_profile_hint (expired-member guests).
    let profile = reporter ?? null;
    if (!profile && ticket.guestEmail) {
      profile = await em.findOne(Profile, { email: ticket.guestEmail });
    }
    if (!profile && ticket.linkedProfileHint) {
      profile = await em.findOne(Profile, { id: ticket.linkedProfileHint });
    }

    let knownAccount: any = null;
    if (profile) {
      const memberships = await em.find(
        Membership,
        { user: profile.id },
        { populate: ['membershipTypeConfig'], orderBy: { endDate: 'DESC' } },
      );
      const latest = memberships[0] || null;

      // Most recent successful login (for IP/UA + timestamp).
      let lastLogin = await em.findOne(
        LoginAuditLog,
        { user: profile.id, action: 'login' },
        { orderBy: { created_at: 'DESC' } },
      );
      if (!lastLogin && profile.email) {
        lastLogin = await em.findOne(
          LoginAuditLog,
          { email: profile.email, action: 'login' },
          { orderBy: { created_at: 'DESC' } },
        );
      }

      knownAccount = {
        profile_id: profile.id,
        full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || (profile as any).full_name || null,
        email: profile.email || null,
        meca_id: profile.meca_id || null,
        account_type: (profile as any).account_type || null,
        membership_status: profile.membership_status || 'none',
        membership_expiry: latest?.endDate
          ? latest.endDate.toISOString()
          : (profile.membership_expiry ? profile.membership_expiry.toISOString() : null),
        member_since: (profile as any).member_since ? (profile as any).member_since.toISOString() : null,
        login_banned: (profile as any).login_banned === true,
        last_seen_at: (profile as any).last_seen_at ? (profile as any).last_seen_at.toISOString() : null,
        last_login_at: lastLogin?.created_at ? lastLogin.created_at.toISOString() : null,
        last_login_ip: lastLogin?.ip_address || null,
        last_login_user_agent: lastLogin?.user_agent || null,
        latest_membership: latest ? {
          type_name: latest.membershipTypeConfig?.name || null,
          category: (latest.membershipTypeConfig as any)?.category || null,
          payment_status: latest.paymentStatus,
          end_date: latest.endDate ? latest.endDate.toISOString() : null,
        } : null,
      };
    }

    // Classify the submitter for the panel header.
    let submitterType: string;
    if (reporter) {
      submitterType = profile?.membership_status === 'active' ? 'member_active' : 'member';
    } else if (knownAccount) {
      submitterType = knownAccount.membership_status === 'expired' ? 'guest_expired_member'
        : knownAccount.membership_status === 'active' ? 'guest_active_member'
        : 'guest_known';
    } else {
      submitterType = 'guest_no_account';
    }

    // The submitter's last few other tickets, so staff can see prior history
    // at a glance from the User Report panel.
    const recentTickets = await this.findRecentTicketsForUser(
      em,
      profile?.id || null,
      email,
      ticketId,
      5,
    );

    return {
      submitter_type: submitterType,
      name,
      email,
      is_guest_ticket: ticket.isGuestTicket === true,
      submission: {
        ip_address: ticket.submitterIp || null,
        user_agent: ticket.submitterUserAgent || null,
        created_at: ticket.createdAt ? ticket.createdAt.toISOString() : null,
      },
      known_account: knownAccount,
      recent_tickets: recentTickets,
    };
  }

  async findByTicketNumber(ticketNumber: string): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { ticketNumber }, {
      populate: ['reporter', 'assignedTo', 'event', 'departmentEntity'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketNumber} not found`);
    }
    return ticket;
  }

  async create(
    data: CreateTicketDto,
    userMembershipStatus?: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<Ticket> {
    const em = this.em.fork();

    // Validate per-category custom fields BEFORE creating anything (so a missing
    // required field fails cleanly). Also resolves an event_reference answer
    // into an event id we can link below.
    const category = data.category || TicketCategory.GENERAL;
    const { fields: customFields, eventId: customEventId } =
      await this.customFieldsService.validateForSubmission(category, data.custom_field_answers);

    // Generate ticket number (format: MECA-YYYYMMDD-XXXX)
    const ticketNumber = await this.generateTicketNumber(em);

    // Execute routing rules to determine department, staff, and priority
    const routingResult = await this.routingService.executeRouting({
      title: data.title,
      description: data.description,
      category: data.category || TicketCategory.GENERAL,
      userMembershipStatus,
    });

    const ticketData: any = {
      ticketNumber,
      title: data.title,
      description: data.description,
      category: data.category || TicketCategory.GENERAL,
      // Keep legacy department field for backwards compatibility
      department: data.department || TicketDepartment.GENERAL_SUPPORT,
      // Use routing result priority if available, otherwise use provided or default
      priority: routingResult.priority || data.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      reporter: Reference.createFromPK(Profile, data.reporter_id),
      submitterIp: meta?.ipAddress,
      submitterUserAgent: meta?.userAgent,
    };

    // Department: prefer the one the submitter chose; otherwise fall back to
    // what routing resolved from the category/keywords.
    const chosenDepartmentId = (data as any).department_id || routingResult.departmentId;
    if (chosenDepartmentId) {
      ticketData.departmentEntity = Reference.createFromPK(TicketDepartmentEntity, chosenDepartmentId);
    }

    // Set assigned staff from routing if available
    if (routingResult.staffId) {
      // Get the profile_id from the staff record
      const staff = await this.staffService.findById(routingResult.staffId);
      if (staff && staff.profile) {
        ticketData.assignedTo = Reference.createFromPK(Profile, staff.profile.id);
        ticketData.status = TicketStatus.IN_PROGRESS; // Auto-assign changes status
      }
    }

    // Prefer an explicitly-sent event_id; otherwise use an event_reference
    // custom-field answer.
    const effectiveEventId = data.event_id || customEventId;
    if (effectiveEventId) {
      ticketData.event = Reference.createFromPK(Event, effectiveEventId);
    }

    const ticket = em.create(Ticket, ticketData);
    await em.persistAndFlush(ticket);

    // Persist custom-field answers (event_reference answers are skipped — they
    // were folded into ticket.event above).
    await this.customFieldsService.persistAnswers(em, ticket.id, customFields, data.custom_field_answers);

    // Fetch the full ticket with relations for email notifications
    const createdTicket = await this.findById(ticket.id);

    // Send email notifications (don't await to avoid blocking response)
    this.sendTicketCreatedEmails(createdTicket, routingResult.departmentId).catch(err => {
      this.logger.error(`Failed to send ticket creation emails: ${err.message}`);
    });

    return createdTicket;
  }

  async update(
    id: string,
    data: UpdateTicketDto,
    requester?: { userId: string; isAdmin: boolean },
  ): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id }, { populate: ['reporter'] });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Authorization (skipped for trusted internal callers that omit
    // `requester`, e.g. assignTicket / resolveTicket which run through
    // admin-gated endpoints).
    if (requester && !requester.isAdmin) {
      const reporterId = ticket.reporter?.id;
      if (!reporterId || reporterId !== requester.userId) {
        throw new ForbiddenException('You can only edit tickets you reported.');
      }
      if (ticket.status === TicketStatus.CLOSED) {
        throw new ForbiddenException('Closed tickets cannot be edited. Please open a new ticket.');
      }
      // Reporters can self-edit factual content only — title, description,
      // and category. Admin-only fields (status, priority, assignment,
      // department routing) are silently dropped to keep one update path.
      const allowed = new Set(['title', 'description', 'category']);
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
          delete (data as any)[key];
        }
      }
    }

    // Track old status for email notification
    const oldStatus = ticket.status;

    // Set properties explicitly instead of em.assign() — Ticket has
    // serializedName on ticket_number, department_id, guest_email,
    // guest_name, access_token, is_guest_ticket, resolved_at, created_at,
    // updated_at. em.assign() mis-maps keys when serializedName is set
    // (same bug pattern that crashed routing-rule update with a 500).
    if (data.title !== undefined) ticket.title = data.title;
    if (data.description !== undefined) ticket.description = data.description;
    if (data.category !== undefined) ticket.category = data.category as any;
    if (data.department !== undefined) ticket.department = data.department as any;
    if (data.priority !== undefined) ticket.priority = data.priority as any;
    if (data.status !== undefined) {
      ticket.status = data.status as any;
      // Stamp the matching transition timestamp. Don't overwrite an existing
      // value — keeps the first transition's timestamp when a ticket cycles
      // through resolved → reopened → resolved (so the original SLA isn't
      // lost). reopenTicket() clears these explicitly when needed.
      if (data.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }
      if (data.status === TicketStatus.CLOSED && !ticket.closedAt) {
        ticket.closedAt = new Date();
      }
    }

    // FK fields can come back as either UUID strings (clean) or as the
    // populated entity object (when the UI round-trips a list/get response).
    // Coerce to a plain UUID before passing to Reference.createFromPK.
    const extractId = (v: unknown): string | null | undefined => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null && 'id' in v) {
        const inner = (v as { id: unknown }).id;
        return typeof inner === 'string' ? inner : null;
      }
      return null;
    };

    const assignedToId = extractId(data.assigned_to_id);
    if (assignedToId !== undefined) {
      ticket.assignedTo = assignedToId
        ? Reference.createFromPK(Profile, assignedToId) as any
        : null as any;
    }

    const eventId = extractId(data.event_id);
    if (eventId !== undefined) {
      ticket.event = eventId
        ? Reference.createFromPK(Event, eventId) as any
        : null as any;
    }

    // Department FK swap. We don't touch the legacy `department` text
    // column when only department_id is sent — most callers operate on
    // the FK and rely on relation population for the display name.
    const departmentId = extractId((data as any).department_id);
    if (departmentId !== undefined) {
      ticket.departmentEntity = departmentId
        ? Reference.createFromPK(TicketDepartmentEntity, departmentId) as any
        : null as any;
    }

    if (data.resolved_at !== undefined) {
      ticket.resolvedAt = data.resolved_at as any;
    }

    await em.flush();

    const updatedTicket = await this.findById(id);

    // Send status change email if status was updated
    if (data.status !== undefined && data.status !== oldStatus) {
      this.sendTicketStatusEmail(updatedTicket, oldStatus, data.status).catch(err => {
        this.logger.error(`Failed to send ticket status email: ${err.message}`);
      });
    }

    return updatedTicket;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Delete related comments and attachments first
    await em.nativeDelete(TicketAttachment, { ticket: id });
    await em.nativeDelete(TicketComment, { ticket: id });
    await em.removeAndFlush(ticket);
  }

  async assignTicket(id: string, assignedToId: string): Promise<Ticket> {
    return this.update(id, {
      assigned_to_id: assignedToId,
      status: TicketStatus.IN_PROGRESS,
    });
  }

  async resolveTicket(id: string): Promise<Ticket> {
    return this.update(id, {
      status: TicketStatus.RESOLVED,
      resolved_at: new Date(),
    });
  }

  async closeTicket(id: string): Promise<Ticket> {
    return this.update(id, { status: TicketStatus.CLOSED });
  }

  /**
   * Lets the original reporter close their own ticket from the member-side
   * reply form, optionally attaching a satisfaction rating (1–5) and a short
   * feedback note. Admin-driven closes use the regular closeTicket path so
   * they don't inadvertently overwrite a member's rating.
   *
   * Throws ForbiddenException if the caller isn't the reporter — we never
   * want a third party setting "customer feedback" on someone else's ticket.
   */
  async closeByReporter(
    id: string,
    userId: string,
    rating?: number,
    feedback?: string,
  ): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id }, { populate: ['reporter'] });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    if (!ticket.reporter || ticket.reporter.id !== userId) {
      throw new ForbiddenException('Only the ticket reporter can close with feedback.');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      // Idempotent: re-submitting from a stale form shouldn't 400.
      return this.findById(id);
    }

    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new ForbiddenException('Rating must be an integer from 1 to 5.');
      }
      ticket.customerRating = rating;
    }
    if (feedback !== undefined && feedback !== null) {
      // Trim + bound to keep this from accidentally becoming an unbounded
      // free-text field. 2000 chars is plenty for a satisfaction note.
      const trimmed = feedback.trim().slice(0, 2000);
      if (trimmed.length > 0) {
        ticket.customerFeedback = trimmed;
      }
    }

    const oldStatus = ticket.status;
    ticket.status = TicketStatus.CLOSED;
    if (!ticket.closedAt) ticket.closedAt = new Date();
    await em.flush();

    const updated = await this.findById(id);

    // Reuse the standard status-change email/notification path so the
    // assigned staff knows the customer closed it out.
    this.sendTicketStatusEmail(updated, oldStatus, TicketStatus.CLOSED).catch(err => {
      this.logger.error(`Failed to send ticket status email: ${err.message}`);
    });

    return updated;
  }

  /**
   * Place a ticket on hold (waiting on external party, vendor, legal,
   * unreachable customer, etc.). Keeps the ticket in the "active" group
   * so it stays visible to admins.
   */
  async holdTicket(id: string): Promise<Ticket> {
    return this.update(id, { status: TicketStatus.ON_HOLD });
  }

  async reopenTicket(id: string, requesterId?: string, isAdmin = false): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id }, { populate: ['reporter'] });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Authorization: only the ticket's reporter or an admin may reopen it.
    // (Previously this endpoint was unguarded — any authenticated user could
    // reopen any ticket.)
    if (!isAdmin && requesterId && ticket.reporter?.id !== requesterId) {
      throw new ForbiddenException('Only the ticket reporter or an admin can reopen this ticket.');
    }

    // Members can only reopen within 7 days of the ticket being closed/resolved.
    // Admins are not time-limited. Use closedAt, falling back to resolvedAt.
    if (!isAdmin) {
      const endedAt = ticket.closedAt ?? ticket.resolvedAt;
      if (endedAt && Date.now() - endedAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
        throw new BadRequestException(
          'This ticket was closed more than 7 days ago and can no longer be reopened. Please open a new ticket.',
        );
      }
    }

    // Reopened is its own status so admins can see recidivism at a glance
    // (separate filter / count from brand-new tickets). Clear both
    // transition timestamps so a re-resolve/re-close stamps fresh ones.
    ticket.status = TicketStatus.REOPENED;
    ticket.resolvedAt = undefined;
    ticket.closedAt = undefined;
    await em.flush();

    return this.findById(id);
  }

  /**
   * Staff-set per-reply auto-close countdown. Sets auto_close_at = now + hours so
   * the hourly TicketAutoCloseService closes the ticket if the customer doesn't
   * reply first (a customer reply clears it). hours <= 0 clears the timer.
   */
  async setAutoCloseTimer(id: string, hours: number): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    if (!hours || hours <= 0) {
      ticket.autoCloseAt = undefined;
    } else {
      const capped = Math.min(Math.floor(hours), 24 * 30); // cap at 30 days
      ticket.autoCloseAt = new Date(Date.now() + capped * 60 * 60 * 1000);
    }
    await em.flush();
    return this.findById(id);
  }

  /**
   * Admin-only "Change Status" path. Validates the transition against
   * TICKET_STATUS_TRANSITIONS (the same matrix the UI dropdown uses) and
   * stamps resolved_at / closed_at when moving to those terminal-ish states.
   * Throws BadRequestException on a disallowed transition so the UI can show
   * a clean error instead of corrupting the workflow.
   */
  async changeStatus(id: string, nextStatus: TicketStatus): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const current = ticket.status;
    if (current === nextStatus) {
      // No-op rather than 400 — admin clicked the current status by accident.
      return this.findById(id);
    }

    const allowed = TICKET_STATUS_TRANSITIONS[current] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Cannot move ticket from "${current}" to "${nextStatus}". Allowed next statuses: ${allowed.join(', ') || '(none)'}.`,
      );
    }

    ticket.status = nextStatus;
    if (nextStatus === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    if (nextStatus === TicketStatus.CLOSED && !ticket.closedAt) {
      ticket.closedAt = new Date();
    }
    if (nextStatus === TicketStatus.REOPENED) {
      // Clear terminal timestamps so a subsequent re-resolve stamps fresh.
      ticket.resolvedAt = undefined;
      ticket.closedAt = undefined;
    }
    await em.flush();

    return this.findById(id);
  }

  // ==========================================================================
  // Comment Operations
  // ==========================================================================

  async findCommentsByTicket(ticketId: string, includeInternal: boolean = false): Promise<TicketComment[]> {
    const em = this.em.fork();
    const where: any = { ticket: ticketId };

    if (!includeInternal) {
      where.isInternal = false;
    }

    return em.find(TicketComment, where, {
      orderBy: { createdAt: 'ASC' },
      populate: ['author'],
    });
  }

  async createComment(
    data: CreateTicketCommentDto,
    isStaffReply: boolean = false,
    skipSignature: boolean = false,
  ): Promise<TicketComment> {
    const em = this.em.fork();

    // Verify ticket exists and get reporter info
    const ticket = await em.findOne(Ticket, { id: data.ticket_id }, {
      populate: ['reporter', 'assignedTo'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${data.ticket_id} not found`);
    }

    // Customers must reopen a resolved/closed ticket before replying (staff and
    // internal notes are exempt). The client hides the composer for these
    // statuses; this is the server-side backstop.
    if (
      !isStaffReply &&
      !data.is_internal &&
      (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED)
    ) {
      throw new BadRequestException(
        `This ticket is ${ticket.status}. Please reopen it before replying.`,
      );
    }

    // Get author info
    const author = await em.findOne(Profile, { id: data.author_id });

    // Staff replies are authored in a rich-text editor → stored as sanitized
    // HTML (sanitizeSignatureHtml = the same strict allowlist used for email
    // signatures). Customer/guest replies stay plain text. content_format drives
    // both the in-thread render and the outbound email rendering.
    const isHtmlReply = isStaffReply;
    const safeContent = isHtmlReply ? sanitizeSignatureHtml(data.content) : data.content;
    const commentData: any = {
      ticket: Reference.createFromPK(Ticket, data.ticket_id),
      author: Reference.createFromPK(Profile, data.author_id),
      content: safeContent,
      contentFormat: isHtmlReply ? 'html' : 'text',
      isInternal: data.is_internal || false,
    };

    const comment = em.create(TicketComment, commentData);
    await em.persistAndFlush(comment);

    // Auto-transition status to reflect "who has the ball" so admins can tell
    // at a glance whether a ticket is waiting on the customer or on support.
    // Internal staff notes never change status — they're a private discussion,
    // not a customer-facing reply.
    // on_hold / resolved / closed are intentionally untouched: hold is a
    // manual admin state and a reply on a resolved/closed ticket should
    // reopen via the explicit Reopen button, not via a comment side effect.
    if (!data.is_internal) {
      // Any non-internal reply (from either side) restarts the inactivity
      // clock, so cancel a pending auto-close warning. Persisted by the flush
      // in the branches below (or the unconditional flush at the end).
      const hadWarning = !!ticket.autoCloseWarningAt;
      if (hadWarning) ticket.autoCloseWarningAt = undefined;
      // Any reply also cancels a staff-set auto-close countdown (the customer
      // responded, or staff is replying again). The "Reply + auto-close" flow
      // re-sets a fresh timer via a follow-up call after this.
      const hadTimer = !!ticket.autoCloseAt;
      if (hadTimer) ticket.autoCloseAt = undefined;

      // Statuses where comment activity should auto-shift the workflow.
      // ON_HOLD / RESOLVED / CLOSED require explicit admin moves.
      const isActive =
        ticket.status === TicketStatus.OPEN ||
        ticket.status === TicketStatus.IN_PROGRESS ||
        ticket.status === TicketStatus.AWAITING_RESPONSE ||
        ticket.status === TicketStatus.PENDING_INTERNAL_REVIEW ||
        ticket.status === TicketStatus.ESCALATED ||
        ticket.status === TicketStatus.REOPENED;

      if (isActive) {
        if (isStaffReply) {
          // Staff replied → now waiting on the customer.
          if (ticket.status !== TicketStatus.AWAITING_RESPONSE) {
            ticket.status = TicketStatus.AWAITING_RESPONSE;
            await em.flush();
          }
        } else if (ticket.status === TicketStatus.AWAITING_RESPONSE) {
          // Customer replied while we were waiting on them — flip back
          // to support's court. If the ticket is in an explicit staff
          // state (ESCALATED / PENDING_INTERNAL_REVIEW), leave it alone
          // so the workflow signal isn't lost.
          ticket.status = ticket.assignedTo
            ? TicketStatus.IN_PROGRESS
            : TicketStatus.OPEN;
          await em.flush();
        }
      }

      // Persist the cleared warning/timer if no status-change branch flushed it.
      if (hadWarning || hadTimer) await em.flush();
    }

    // Send reply notification email (only for non-internal comments)
    if (!data.is_internal && author) {
      this.sendTicketReplyEmail(ticket, safeContent, author, isStaffReply, skipSignature).catch(err => {
        this.logger.error(`Failed to send ticket reply email: ${err.message}`);
      });
    }

    return comment;
  }

  async updateComment(
    id: string,
    data: UpdateTicketCommentDto,
    editor?: { editorId: string; isStaff: boolean },
  ): Promise<TicketComment> {
    const em = this.em.fork();
    const comment = await em.findOne(TicketComment, { id }, { populate: ['author'] });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Authorization: a staff member may edit ONLY their own reply. We never let
    // anyone edit another person's words (another agent's, or the customer's)
    // from here. editor is optional so internal/system callers can still update.
    if (editor) {
      const authorId = comment.author?.id;
      if (!editor.isStaff || !authorId || authorId !== editor.editorId) {
        throw new ForbiddenException('You can only edit your own staff replies.');
      }
    }

    if (data.content !== undefined) {
      // Re-run the SAME sanitizer the create path uses, so an edit can't slip
      // raw HTML past the allowlist — and so the entity/&nbsp; handling applies
      // to edits too. Plain-text (customer) comments are stored as-is.
      comment.content =
        comment.contentFormat === 'html' ? sanitizeSignatureHtml(data.content) : data.content;
    }
    if (data.is_internal !== undefined) comment.isInternal = data.is_internal;

    await em.flush();
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    const em = this.em.fork();
    const comment = await em.findOne(TicketComment, { id });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Delete related attachments
    await em.nativeDelete(TicketAttachment, { comment: id });
    await em.removeAndFlush(comment);
  }

  // ==========================================================================
  // Attachment Operations
  // ==========================================================================

  async findAttachmentsByTicket(ticketId: string): Promise<TicketAttachment[]> {
    const em = this.em.fork();
    return em.find(TicketAttachment, { ticket: ticketId }, {
      orderBy: { createdAt: 'ASC' },
      populate: ['uploader'],
    });
  }

  async createAttachment(data: CreateTicketAttachmentDto): Promise<TicketAttachment> {
    const em = this.em.fork();

    const attachmentData: any = {
      ticket: Reference.createFromPK(Ticket, data.ticket_id),
      uploader: Reference.createFromPK(Profile, data.uploader_id),
      fileName: data.file_name,
      filePath: data.file_path,
      // bucket + storagePath let the proxy-download endpoint fetch the
      // file from Supabase Storage without round-tripping through the
      // public URL. Optional so older clients that don't send them still
      // work (the runtime falls back to parsing file_path).
      bucket: (data as any).bucket,
      storagePath: (data as any).storage_path,
      fileSize: data.file_size,
      mimeType: data.mime_type,
    };

    if (data.comment_id) {
      attachmentData.comment = Reference.createFromPK(TicketComment, data.comment_id);
    }

    const attachment = em.create(TicketAttachment, attachmentData);
    await em.persistAndFlush(attachment);
    return attachment;
  }

  /**
   * Resolve an attachment for a proxy download, enforcing access control.
   * Allowed: the ticket reporter, the assigned staff member, any admin.
   * Returns the raw bytes + content metadata so the controller can stream
   * them back through our own domain (masking the Supabase storage host
   * and preventing the public URL from leaking to anyone who copies it).
   *
   * Falls back to parsing file_path when bucket/storage_path aren't set,
   * since the column-add migration only backfills standard URL shapes.
   */
  async getAttachmentForDownload(
    ticketId: string,
    attachmentId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
    const em = this.em.fork();
    const attachment = await em.findOne(
      TicketAttachment,
      { id: attachmentId, ticket: ticketId },
      { populate: ['ticket', 'ticket.reporter', 'ticket.assignedTo'] },
    );
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (!isAdmin) {
      const reporterId = attachment.ticket.reporter?.id;
      const assigneeId = attachment.ticket.assignedTo?.id;
      const allowed = reporterId === requesterId || assigneeId === requesterId;
      if (!allowed) {
        throw new ForbiddenException('You do not have access to this attachment.');
      }
    }

    return this.downloadAttachmentBytes(attachment);
  }

  /**
   * Guest variant of getAttachmentForDownload. Authorizes purely by the
   * ticket's access_token (the magic-link credential) instead of a logged-in
   * user — so a guest can view attachments (e.g. screenshots staff sent) on
   * THEIR ticket only. Used by the @Public guest download endpoint.
   */
  async getAttachmentForGuestDownload(
    accessToken: string,
    attachmentId: string,
  ): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
    const em = this.em.fork();
    const attachment = await em.findOne(
      TicketAttachment,
      { id: attachmentId },
      { populate: ['ticket'] },
    );
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    // The attachment must belong to a guest ticket whose access_token matches.
    if (!attachment.ticket?.isGuestTicket || !accessToken || attachment.ticket.accessToken !== accessToken) {
      throw new ForbiddenException('You do not have access to this attachment.');
    }

    return this.downloadAttachmentBytes(attachment);
  }

  /** Fetch the raw bytes for an attachment from Supabase Storage. */
  private async downloadAttachmentBytes(
    attachment: TicketAttachment,
  ): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
    const resolved = this.resolveAttachmentStorage(attachment);
    if (!resolved) {
      throw new NotFoundException('Attachment storage location is missing.');
    }

    const { data, error } = await this.supabaseAdmin
      .getClient()
      .storage.from(resolved.bucket)
      .download(resolved.path);

    if (error || !data) {
      this.logger.error(
        `Storage download failed for ${resolved.bucket}/${resolved.path}: ${error?.message}`,
      );
      throw new NotFoundException('Attachment file is unavailable.');
    }

    // Supabase returns a Blob in node — convert to Buffer for streaming.
    const buffer = Buffer.from(await data.arrayBuffer());
    return {
      data: buffer,
      mimeType: attachment.mimeType,
      fileName: attachment.fileName,
    };
  }

  /**
   * Pull (bucket, path) from an attachment row. Prefers the dedicated
   * columns; falls back to parsing the legacy file_path URL for rows
   * created before the column-add migration.
   */
  private resolveAttachmentStorage(
    attachment: TicketAttachment,
  ): { bucket: string; path: string } | null {
    if (attachment.bucket && attachment.storagePath) {
      return { bucket: attachment.bucket, path: attachment.storagePath };
    }
    if (!attachment.filePath) return null;
    // Standard Supabase URL shape:
    //   https://<host>/storage/v1/object/(public|sign)/<bucket>/<path>[?token=...]
    const match = attachment.filePath.match(
      /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/,
    );
    if (!match) return null;
    return { bucket: match[1], path: match[2] };
  }

  async deleteAttachment(id: string): Promise<void> {
    const em = this.em.fork();
    const attachment = await em.findOne(TicketAttachment, { id });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    await em.removeAndFlush(attachment);
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  async getStats(): Promise<any> {
    const em = this.em.fork();

    const [
      total,
      open,
      inProgress,
      awaitingResponse,
      pendingInternalReview,
      escalated,
      onHold,
      resolved,
      reopened,
      closed,
      lowPriority,
      mediumPriority,
      highPriority,
      criticalPriority,
    ] = await Promise.all([
      em.count(Ticket, {}),
      em.count(Ticket, { status: TicketStatus.OPEN }),
      em.count(Ticket, { status: TicketStatus.IN_PROGRESS }),
      em.count(Ticket, { status: TicketStatus.AWAITING_RESPONSE }),
      em.count(Ticket, { status: TicketStatus.PENDING_INTERNAL_REVIEW }),
      em.count(Ticket, { status: TicketStatus.ESCALATED }),
      em.count(Ticket, { status: TicketStatus.ON_HOLD }),
      em.count(Ticket, { status: TicketStatus.RESOLVED }),
      em.count(Ticket, { status: TicketStatus.REOPENED }),
      em.count(Ticket, { status: TicketStatus.CLOSED }),
      em.count(Ticket, { priority: TicketPriority.LOW }),
      em.count(Ticket, { priority: TicketPriority.MEDIUM }),
      em.count(Ticket, { priority: TicketPriority.HIGH }),
      em.count(Ticket, { priority: TicketPriority.CRITICAL }),
    ]);

    // Calculate average resolution time
    const resolvedTickets = await em.find(Ticket, {
      status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
      resolvedAt: { $ne: null },
    });

    let averageResolutionTimeHours: number | null = null;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, ticket) => {
        if (ticket.resolvedAt) {
          const diffMs = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
          return sum + (diffMs / (1000 * 60 * 60));
        }
        return sum;
      }, 0);
      averageResolutionTimeHours = Math.round(totalHours / resolvedTickets.length * 10) / 10;
    }

    // Count by category
    const byCategory: Record<string, number> = {};
    for (const cat of Object.values(TicketCategory)) {
      byCategory[cat] = await em.count(Ticket, { category: cat });
    }

    // Count by department
    const byDepartment: Record<string, number> = {};
    for (const dept of Object.values(TicketDepartment)) {
      byDepartment[dept] = await em.count(Ticket, { department: dept });
    }

    return {
      total,
      open,
      in_progress: inProgress,
      awaiting_response: awaitingResponse,
      pending_internal_review: pendingInternalReview,
      escalated,
      on_hold: onHold,
      resolved,
      reopened,
      closed,
      by_priority: {
        low: lowPriority,
        medium: mediumPriority,
        high: highPriority,
        critical: criticalPriority,
      },
      by_category: byCategory,
      by_department: byDepartment,
      average_resolution_time_hours: averageResolutionTimeHours,
    };
  }

  /**
   * Aggregate customer-rating data per support agent for the admin Staff →
   * Ratings view. Counts and averages credit the assigned_to_id at close
   * time (which is who the customer's rating implicitly evaluates). Tickets
   * with no assignee or no rating are excluded entirely.
   *
   * Returns one row per agent with up to `recentLimit` of their most recent
   * rated tickets inlined for the drill-down panel. Recent ratings are
   * fetched in a second query so we don't pay JSON-aggregation gymnastics
   * inside Postgres just for the UI.
   */
  async getStaffRatings(recentLimit = 5): Promise<Array<{
    profile_id: string;
    full_name: string;
    email: string;
    rating_count: number;
    average_rating: number;
    five_star: number;
    one_star: number;
    recent: Array<{
      ticket_id: string;
      ticket_number: string;
      title: string;
      rating: number;
      feedback: string | null;
      closed_at: string | null;
    }>;
  }>> {
    const em = this.em.fork();

    // Per-agent rollup. AVG returns numeric — coerce to float so JSON has a
    // plain number, not the pg numeric "12.50" string. COUNT FILTER is
    // standard SQL and avoids a CASE WHEN.
    const rows: Array<{
      profile_id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      rating_count: string;
      average_rating: string;
      five_star: string;
      one_star: string;
    }> = await em.getConnection().execute(`
      SELECT
        p.id AS profile_id,
        p.first_name,
        p.last_name,
        p.email,
        COUNT(t.customer_rating) AS rating_count,
        AVG(t.customer_rating)::float8 AS average_rating,
        COUNT(*) FILTER (WHERE t.customer_rating = 5) AS five_star,
        COUNT(*) FILTER (WHERE t.customer_rating = 1) AS one_star
      FROM tickets t
      JOIN profiles p ON p.id = t.assigned_to_id
      WHERE t.customer_rating IS NOT NULL
      GROUP BY p.id, p.first_name, p.last_name, p.email
      ORDER BY AVG(t.customer_rating) DESC, COUNT(t.customer_rating) DESC
    `);

    if (rows.length === 0) return [];

    const profileIds = rows.map(r => r.profile_id);

    // Pull recent rated tickets per agent. We over-fetch then trim per
    // agent in JS — keeps the SQL simple (no LATERAL or window function)
    // and the result set stays small in practice. Build IN-clause
    // placeholders by hand because MikroORM's raw-SQL `?` substitution
    // expects scalar params (see project memory note).
    const inPlaceholders = profileIds.map(() => '?').join(',');
    const recents: Array<{
      assigned_to_id: string;
      ticket_id: string;
      ticket_number: string;
      title: string;
      rating: number;
      feedback: string | null;
      closed_at: Date | null;
    }> = await em.getConnection().execute(
      `
      SELECT
        t.assigned_to_id,
        t.id AS ticket_id,
        t.ticket_number,
        t.title,
        t.customer_rating AS rating,
        t.customer_feedback AS feedback,
        t.closed_at
      FROM tickets t
      WHERE t.customer_rating IS NOT NULL
        AND t.assigned_to_id IN (${inPlaceholders})
      ORDER BY t.closed_at DESC NULLS LAST, t.updated_at DESC
      `,
      profileIds,
    );

    const recentByAgent = new Map<string, typeof recents>();
    for (const r of recents) {
      const list = recentByAgent.get(r.assigned_to_id) ?? [];
      if (list.length < recentLimit) {
        list.push(r);
        recentByAgent.set(r.assigned_to_id, list);
      }
    }

    return rows.map(r => {
      const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email;
      const list = recentByAgent.get(r.profile_id) ?? [];
      return {
        profile_id: r.profile_id,
        full_name: fullName,
        email: r.email,
        rating_count: Number(r.rating_count),
        average_rating: Number(r.average_rating),
        five_star: Number(r.five_star),
        one_star: Number(r.one_star),
        recent: list.map(rec => ({
          ticket_id: rec.ticket_id,
          ticket_number: rec.ticket_number,
          title: rec.title,
          rating: rec.rating,
          feedback: rec.feedback,
          closed_at: rec.closed_at ? new Date(rec.closed_at).toISOString() : null,
        })),
      };
    });
  }

  async getMyTickets(userId: string): Promise<Ticket[]> {
    const em = this.em.fork();
    return em.find(Ticket, { reporter: userId }, {
      orderBy: { createdAt: 'DESC' },
      populate: ['assignedTo', 'event'],
    });
  }

  async getAssignedTickets(userId: string): Promise<Ticket[]> {
    const em = this.em.fork();
    return em.find(Ticket, { assignedTo: userId }, {
      orderBy: { priority: 'DESC', createdAt: 'ASC' },
      populate: ['reporter', 'event', 'departmentEntity'],
    });
  }

  /**
   * Get tickets for a staff member filtered by their assigned departments.
   * Staff can only see tickets in departments they are assigned to.
   */
  async getTicketsForStaff(profileId: string, query?: TicketListQuery): Promise<{ data: Ticket[]; total: number }> {
    // Get the staff member's assigned department IDs
    const departmentIds = await this.staffService.getStaffDepartmentIds(profileId);

    if (departmentIds.length === 0) {
      // Staff has no department assignments - return empty
      return { data: [], total: 0 };
    }

    const em = this.em.fork();
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query || {};

    const offset = (page - 1) * limit;
    const where: any = {
      departmentEntity: { $in: departmentIds },
    };

    // Same multi-select parsing as findAll — see splitCsv comment there.
    const splitCsv = (v: unknown): string[] => {
      if (v === undefined || v === null || v === '') return [];
      if (Array.isArray(v)) return v.map(String).filter(Boolean);
      return String(v).split(',').map(s => s.trim()).filter(Boolean);
    };

    if (status === 'active' as any) {
      where.status = { $in: ['open', 'in_progress', 'awaiting_response', 'pending_internal_review', 'escalated', 'on_hold', 'reopened'] };
    } else {
      const statuses = splitCsv(status);
      if (statuses.length === 1) where.status = statuses[0];
      else if (statuses.length > 1) where.status = { $in: statuses };
    }
    const priorities = splitCsv(priority);
    if (priorities.length === 1) where.priority = priorities[0];
    else if (priorities.length > 1) where.priority = { $in: priorities };
    if (category) where.category = category;

    if (search) {
      where.$or = [
        { title: { $like: `%${search}%` } },
        { description: { $like: `%${search}%` } },
        { ticketNumber: { $like: `%${search}%` } },
      ];
    }

    const orderBy: any = {};
    const sortField = sort_by === 'created_at' ? 'createdAt' :
                      sort_by === 'updated_at' ? 'updatedAt' :
                      sort_by;
    orderBy[sortField] = sort_order.toUpperCase();

    const [data, total] = await Promise.all([
      em.find(Ticket, where, {
        limit,
        offset,
        orderBy,
        populate: ['reporter', 'assignedTo', 'event', 'departmentEntity'],
      }),
      em.count(Ticket, where),
    ]);

    return { data, total };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async generateTicketNumber(em: EntityManager): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Count today's tickets to generate sequence
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayCount = await em.count(Ticket, {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const sequence = String(todayCount + 1).padStart(4, '0');
    return `MECA-${dateStr}-${sequence}`;
  }

  // ==========================================================================
  // Email Notification Methods
  // ==========================================================================

  /**
   * Send emails when a new ticket is created:
   * 1. Confirmation email to the submitter
   * 2. Alert email to assigned department staff
   */
  private async sendTicketCreatedEmails(ticket: Ticket, departmentId?: string): Promise<void> {
    // Member-facing ticket detail route is /tickets/:id where :id is the
    // ticket UUID — NOT /support/tickets/:ticketNumber. The old path matched
    // no route, so the recipient landed on the homepage.
    const viewTicketUrl = `${this.frontendUrl}/tickets/${ticket.id}`;

    // Send confirmation email to submitter
    if (ticket.reporter?.email) {
      await this.emailService.sendTicketCreatedEmail({
        to: ticket.reporter.email,
        firstName: ticket.reporter.first_name || undefined,
        ticketNumber: ticket.ticketNumber,
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        category: ticket.category,
        viewTicketUrl,
      });
    }

    if (ticket.reporter?.id) {
      await this.notificationsService.createForUser({
        userId: ticket.reporter.id,
        title: `Ticket ${ticket.ticketNumber} created`,
        message: `Your support ticket has been received. We'll respond shortly.`,
        type: 'info',
        link: `/tickets/${ticket.id}`,
      });
    }

    // Send alert email to department staff
    if (departmentId) {
      await this.sendStaffAlertEmails(ticket, departmentId, viewTicketUrl);
    }
  }

  /**
   * Send alert emails to all staff members assigned to a department
   */
  private async sendStaffAlertEmails(ticket: Ticket, departmentId: string, viewTicketUrl: string): Promise<void> {
    const em = this.em.fork();

    // Get department info
    const department = await em.findOne(TicketDepartmentEntity, { id: departmentId });
    if (!department) return;

    // Get all staff assignments for this department
    const staffAssignments = await em.find(TicketStaffDepartment, {
      department: departmentId,
    }, {
      populate: ['staff.profile'],
    });

    const reporterName = ticket.reporter
      ? `${ticket.reporter.first_name || ''} ${ticket.reporter.last_name || ''}`.trim() || 'Unknown'
      : 'Guest User';
    const reporterEmail = ticket.reporter?.email || 'No email provided';

    // Send email to each staff member
    for (const assignment of staffAssignments) {
      const staffEmail = assignment.staff?.profile?.email;
      if (staffEmail) {
        const staffProfile = assignment.staff!.profile!;
        await this.emailService.sendTicketStaffAlertEmail({
          to: staffEmail,
          staffName: staffProfile.first_name || undefined,
          ticketNumber: ticket.ticketNumber,
          ticketTitle: ticket.title,
          ticketDescription: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          departmentName: department.name,
          reporterName,
          reporterEmail,
          viewTicketUrl: `${this.frontendUrl}/admin/tickets/${ticket.id}`,
        });
      }
    }
  }

  /**
   * Send status change notification email to ticket submitter
   */
  private async sendTicketStatusEmail(ticket: Ticket, oldStatus: string, newStatus: string): Promise<void> {
    if (!ticket.reporter?.email) return;

    // Member-facing route is /tickets/:uuid — see comment in sendTicketCreatedEmails.
    const viewTicketUrl = `${this.frontendUrl}/tickets/${ticket.id}`;

    await this.emailService.sendTicketStatusEmail({
      to: ticket.reporter.email,
      firstName: ticket.reporter.first_name || undefined,
      ticketNumber: ticket.ticketNumber,
      ticketTitle: ticket.title,
      oldStatus,
      newStatus,
      viewTicketUrl,
    });

    if (ticket.reporter?.id) {
      await this.notificationsService.createForUser({
        userId: ticket.reporter.id,
        title: `Ticket ${ticket.ticketNumber} updated`,
        message: `Status changed from "${oldStatus}" to "${newStatus}".`,
        type: 'info',
        link: `/tickets/${ticket.id}`,
      });
    }
  }

  /**
   * Send reply notification email
   * - If staff replies, notify the ticket submitter
   * - If user replies, notify the assigned staff member
   */
  private async sendTicketReplyEmail(
    ticket: Ticket,
    replyContent: string,
    author: Profile,
    isStaffReply: boolean,
    skipSignature: boolean = false,
  ): Promise<void> {
    // When staff replies, link the recipient (member) to /tickets/:uuid.
    // When member replies, link the recipient (assigned staff) to /admin/tickets/:uuid.
    const viewTicketUrl = isStaffReply
      ? `${this.frontendUrl}/tickets/${ticket.id}`
      : `${this.frontendUrl}/admin/tickets/${ticket.id}`;

    const replierName = `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.email || 'Unknown';

    // Only staff replies get a signature appended. Lookup is best-
    // effort - if it throws or returns null, the reply still goes out
    // without a signature rather than failing the email entirely.
    // Skipped when the staff member ticked "don't include my signature" on
    // this particular reply, even though their signature is active.
    let signature: { html: string; plainText: string } | null = null;
    if (isStaffReply && !skipSignature) {
      try {
        signature = await this.signaturesService.getActiveForEmail(author.id);
      } catch (err) {
        this.logger.warn(`Signature lookup failed for ${author.id}: ${(err as Error).message}`);
      }
    }

    if (isStaffReply) {
      // Staff replied - notify the ticket submitter
      if (ticket.reporter?.email && ticket.reporter.id !== author.id) {
        await this.emailService.sendTicketReplyEmail({
          to: ticket.reporter.email,
          recipientName: ticket.reporter.first_name || undefined,
          ticketNumber: ticket.ticketNumber,
          ticketTitle: ticket.title,
          replyContent,
          contentFormat: 'html',
          replierName,
          isStaffReply: true,
          viewTicketUrl,
          signatureHtml: signature?.html || undefined,
          signaturePlainText: signature?.plainText || undefined,
        });

        await this.notificationsService.createForUser({
          userId: ticket.reporter.id,
          title: `New reply on ticket ${ticket.ticketNumber}`,
          message: `${replierName} replied to your ticket.`,
          type: 'message',
          link: `/tickets/${ticket.id}`,
        });
      }
    } else {
      // User replied - notify assigned staff
      if (ticket.assignedTo?.email && ticket.assignedTo.id !== author.id) {
        await this.emailService.sendTicketReplyEmail({
          to: ticket.assignedTo.email,
          recipientName: ticket.assignedTo.first_name || undefined,
          ticketNumber: ticket.ticketNumber,
          ticketTitle: ticket.title,
          replyContent,
          replierName,
          isStaffReply: false,
          viewTicketUrl,
        });

        await this.notificationsService.createForUser({
          userId: ticket.assignedTo.id,
          title: `New reply on ticket ${ticket.ticketNumber}`,
          message: `${replierName} replied to a ticket assigned to you.`,
          type: 'message',
          link: `/admin/tickets/${ticket.id}`,
        });
      }
    }
  }
}
