import { Injectable, Inject, NotFoundException, ForbiddenException, forwardRef, Logger } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketDepartment as TicketDepartmentEntity } from './entities/ticket-department.entity';
import { TicketStaffDepartment } from './entities/ticket-staff-department.entity';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { Membership } from '../memberships/memberships.entity';
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
  CreateTicketDto,
  UpdateTicketDto,
  CreateTicketCommentDto,
  UpdateTicketCommentDto,
  CreateTicketAttachmentDto,
  TicketListQuery,
} from '@newmeca/shared';
import { TicketRoutingService } from './ticket-routing.service';
import { TicketStaffService } from './ticket-staff.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

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
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query as TicketListQuery & { department_id?: string };

    const offset = (page - 1) * limit;
    const where: any = {};

    // 'active' is a synthetic status group meaning "anything that still
    // needs admin attention" — open, in progress, awaiting response.
    // Lets the admin tickets dashboard default-filter out resolved/closed
    // without exposing a special enum value on the entity itself.
    if (status === 'active' as any) {
      where.status = { $in: ['open', 'in_progress', 'awaiting_response', 'on_hold'] };
    } else if (status) {
      where.status = status;
    }
    if (priority) where.priority = priority;
    if (category) where.category = category;
    // Support both legacy department enum and new department_id FK
    if (department_id) {
      where.departmentEntity = department_id;
    } else if (department) {
      where.department = department;
    }
    if (reporter_id) where.reporter = reporter_id;
    if (assigned_to_id) where.assignedTo = assigned_to_id;
    if (event_id) where.event = event_id;

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

  async findById(id: string): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id }, {
      populate: ['reporter', 'assignedTo', 'event', 'departmentEntity'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
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

  async create(data: CreateTicketDto, userMembershipStatus?: string): Promise<Ticket> {
    const em = this.em.fork();

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
    };

    // Set department entity from routing if available
    if (routingResult.departmentId) {
      ticketData.departmentEntity = Reference.createFromPK(TicketDepartmentEntity, routingResult.departmentId);
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

    if (data.event_id) {
      ticketData.event = Reference.createFromPK(Event, data.event_id);
    }

    const ticket = em.create(Ticket, ticketData);
    await em.persistAndFlush(ticket);

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

  async reopenTicket(id: string): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Explicit assignments — same serializedName-safe pattern as update().
    // Clear both transition timestamps so a re-resolve/re-close stamps fresh
    // ones (the ticket is back in the working queue from this point on).
    ticket.status = TicketStatus.OPEN;
    ticket.resolvedAt = undefined;
    ticket.closedAt = undefined;
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
  ): Promise<TicketComment> {
    const em = this.em.fork();

    // Verify ticket exists and get reporter info
    const ticket = await em.findOne(Ticket, { id: data.ticket_id }, {
      populate: ['reporter', 'assignedTo'],
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${data.ticket_id} not found`);
    }

    // Get author info
    const author = await em.findOne(Profile, { id: data.author_id });

    const commentData: any = {
      ticket: Reference.createFromPK(Ticket, data.ticket_id),
      author: Reference.createFromPK(Profile, data.author_id),
      content: data.content,
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
      const isActive =
        ticket.status === TicketStatus.OPEN ||
        ticket.status === TicketStatus.IN_PROGRESS ||
        ticket.status === TicketStatus.AWAITING_RESPONSE;

      if (isActive) {
        if (isStaffReply) {
          // Staff replied → now waiting on the customer.
          if (ticket.status !== TicketStatus.AWAITING_RESPONSE) {
            ticket.status = TicketStatus.AWAITING_RESPONSE;
            await em.flush();
          }
        } else {
          // Customer replied → back to support's court. Pick in_progress
          // when an assignee exists, otherwise open (so it shows up in
          // unassigned queues for someone to grab).
          const target = ticket.assignedTo
            ? TicketStatus.IN_PROGRESS
            : TicketStatus.OPEN;
          if (ticket.status !== target) {
            ticket.status = target;
            await em.flush();
          }
        }
      }
    }

    // Send reply notification email (only for non-internal comments)
    if (!data.is_internal && author) {
      this.sendTicketReplyEmail(ticket, data.content, author, isStaffReply).catch(err => {
        this.logger.error(`Failed to send ticket reply email: ${err.message}`);
      });
    }

    return comment;
  }

  async updateComment(id: string, data: UpdateTicketCommentDto): Promise<TicketComment> {
    const em = this.em.fork();
    const comment = await em.findOne(TicketComment, { id });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    if (data.content !== undefined) comment.content = data.content;
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
      onHold,
      resolved,
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
      em.count(Ticket, { status: TicketStatus.ON_HOLD }),
      em.count(Ticket, { status: TicketStatus.RESOLVED }),
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
      on_hold: onHold,
      resolved,
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

    // Same synthetic 'active' status group as in findAll — see comment there.
    if (status === 'active' as any) {
      where.status = { $in: ['open', 'in_progress', 'awaiting_response', 'on_hold'] };
    } else if (status) {
      where.status = status;
    }
    if (priority) where.priority = priority;
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
  ): Promise<void> {
    // When staff replies, link the recipient (member) to /tickets/:uuid.
    // When member replies, link the recipient (assigned staff) to /admin/tickets/:uuid.
    const viewTicketUrl = isStaffReply
      ? `${this.frontendUrl}/tickets/${ticket.id}`
      : `${this.frontendUrl}/admin/tickets/${ticket.id}`;

    const replierName = `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.email || 'Unknown';

    if (isStaffReply) {
      // Staff replied - notify the ticket submitter
      if (ticket.reporter?.email && ticket.reporter.id !== author.id) {
        await this.emailService.sendTicketReplyEmail({
          to: ticket.reporter.email,
          recipientName: ticket.reporter.first_name || undefined,
          ticketNumber: ticket.ticketNumber,
          ticketTitle: ticket.title,
          replyContent,
          replierName,
          isStaffReply: true,
          viewTicketUrl,
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
