import { Injectable, Inject, NotFoundException, forwardRef, Logger } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketDepartment as TicketDepartmentEntity } from './entities/ticket-department.entity';
import { TicketStaffDepartment } from './entities/ticket-staff-department.entity';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
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

    if (status) where.status = status;
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

  async update(id: string, data: UpdateTicketDto): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id }, { populate: ['reporter'] });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Track old status for email notification
    const oldStatus = ticket.status;

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Auto-set resolvedAt when ticket is resolved
      if (data.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }

    if (data.assigned_to_id !== undefined) {
      updateData.assignedTo = data.assigned_to_id
        ? Reference.createFromPK(Profile, data.assigned_to_id)
        : null;
    }

    if (data.event_id !== undefined) {
      updateData.event = data.event_id
        ? Reference.createFromPK(Event, data.event_id)
        : null;
    }

    if (data.resolved_at !== undefined) {
      updateData.resolvedAt = data.resolved_at;
    }

    em.assign(ticket, updateData);
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

  async reopenTicket(id: string): Promise<Ticket> {
    const em = this.em.fork();
    const ticket = await em.findOne(Ticket, { id });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    em.assign(ticket, {
      status: TicketStatus.OPEN,
      resolvedAt: null,
    });
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

  async createComment(data: CreateTicketCommentDto, isStaffReply: boolean = false): Promise<TicketComment> {
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

    // Update ticket status if customer responded while awaiting response
    if (ticket.status === TicketStatus.AWAITING_RESPONSE && !data.is_internal) {
      ticket.status = TicketStatus.OPEN;
      await em.flush();
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

    if (status) where.status = status;
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
    const viewTicketUrl = `${this.frontendUrl}/support/tickets/${ticket.ticketNumber}`;

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

    const viewTicketUrl = `${this.frontendUrl}/support/tickets/${ticket.ticketNumber}`;

    await this.emailService.sendTicketStatusEmail({
      to: ticket.reporter.email,
      firstName: ticket.reporter.first_name || undefined,
      ticketNumber: ticket.ticketNumber,
      ticketTitle: ticket.title,
      oldStatus,
      newStatus,
      viewTicketUrl,
    });
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
    const viewTicketUrl = isStaffReply
      ? `${this.frontendUrl}/support/tickets/${ticket.ticketNumber}`
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
      }
    }
  }
}
