import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Res,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserRole } from '@newmeca/shared';
import { TicketsService } from './tickets.service';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import {
  CreateTicketDto,
  UpdateTicketDto,
  CreateTicketCommentDto,
  UpdateTicketCommentDto,
  CreateTicketAttachmentDto,
  TicketListQuery,
} from '@newmeca/shared';

@Controller('api/tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require authenticated user
  private async requireAuth(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    return user;
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    const user = await this.requireAuth(authHeader);
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  // ==========================================================================
  // Ticket Endpoints
  // ==========================================================================

  @Get()
  async listTickets(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('department') department?: string,
    @Query('reporter_id') reporter_id?: string,
    @Query('assigned_to_id') assigned_to_id?: string,
    @Query('event_id') event_id?: string,
    @Query('search') search?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
  ): Promise<{ data: Ticket[]; total: number; page: number; limit: number; total_pages: number }> {
    await this.requireAuth(authHeader);
    const query: TicketListQuery = {
      page: page || 1,
      limit: limit || 10,
      status: status as any,
      priority: priority as any,
      category: category as any,
      department: department as any,
      reporter_id,
      assigned_to_id,
      event_id,
      search,
      sort_by: (sort_by as any) || 'created_at',
      sort_order: (sort_order as any) || 'desc',
    };

    const result = await this.ticketsService.findAll(query);
    return {
      ...result,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(result.total / query.limit),
    };
  }

  @Get('stats')
  async getStats(
    @Headers('authorization') authHeader: string,
  ): Promise<any> {
    await this.requireAuth(authHeader);
    return this.ticketsService.getStats();
  }

  @Get('my-tickets/:userId')
  async getMyTickets(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ): Promise<Ticket[]> {
    const user = await this.requireAuth(authHeader);
    // Users can only view their own tickets unless admin
    if (user.id !== userId) {
      const em = this.em.fork();
      const profile = await em.findOne(Profile, { id: user.id });
      if (!isAdminUser(profile)) {
        throw new ForbiddenException('You can only view your own tickets');
      }
    }
    return this.ticketsService.getMyTickets(userId);
  }

  @Get('assigned/:userId')
  async getAssignedTickets(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ): Promise<Ticket[]> {
    await this.requireAuth(authHeader);
    return this.ticketsService.getAssignedTickets(userId);
  }

  @Get('staff/:profileId')
  async getTicketsForStaff(
    @Headers('authorization') authHeader: string,
    @Param('profileId') profileId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
  ): Promise<{ data: Ticket[]; total: number; page: number; limit: number; total_pages: number }> {
    await this.requireAuth(authHeader);
    const query: TicketListQuery = {
      page: page || 1,
      limit: limit || 10,
      status: status as any,
      priority: priority as any,
      category: category as any,
      search,
      sort_by: (sort_by as any) || 'created_at',
      sort_order: (sort_order as any) || 'desc',
    };

    const result = await this.ticketsService.getTicketsForStaff(profileId, query);
    return {
      ...result,
      page: query.page!,
      limit: query.limit!,
      total_pages: Math.ceil(result.total / query.limit!),
    };
  }

  @Get('by-number/:ticketNumber')
  async getByTicketNumber(
    @Headers('authorization') authHeader: string,
    @Param('ticketNumber') ticketNumber: string,
  ): Promise<Ticket> {
    await this.requireAuth(authHeader);
    return this.ticketsService.findByTicketNumber(ticketNumber);
  }

  @Get(':id')
  async getTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<Ticket> {
    await this.requireAuth(authHeader);
    return this.ticketsService.findById(id);
  }

  /**
   * Admin-only enriched reporter context used by the Details panel on
   * /admin/tickets/:id. Returns the reporter's profile + active memberships
   * + role flags (judge / ED / retailer / manufacturer / team memberships)
   * so the admin can identify the member without opening the Members page
   * separately.
   */
  @Get(':id/reporter-context')
  async getReporterContext(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.ticketsService.getReporterContext(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateTicketDto & { user_membership_status?: string },
  ): Promise<Ticket> {
    await this.requireAuth(authHeader);
    const { user_membership_status, ...ticketData } = data;
    return this.ticketsService.create(ticketData, user_membership_status);
  }

  @Put(':id')
  async updateTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateTicketDto,
  ): Promise<Ticket> {
    const user = await this.requireAuth(authHeader);
    // Resolve admin flag once so the service can enforce field-level rules:
    // non-admin reporters can self-edit title/description/category, admins
    // can change everything.
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    return this.ticketsService.update(id, data, {
      userId: user.id,
      isAdmin: isAdminUser(profile),
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.requireAdmin(authHeader);
    return this.ticketsService.delete(id);
  }

  // Ticket Status Actions
  @Post(':id/assign')
  async assignTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body('assigned_to_id') assignedToId: string,
  ): Promise<Ticket> {
    await this.requireAuth(authHeader);
    return this.ticketsService.assignTicket(id, assignedToId);
  }

  @Post(':id/resolve')
  async resolveTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<Ticket> {
    await this.requireAuth(authHeader);
    return this.ticketsService.resolveTicket(id);
  }

  @Post(':id/close')
  async closeTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<Ticket> {
    await this.requireAuth(authHeader);
    return this.ticketsService.closeTicket(id);
  }

  /**
   * Reporter-driven close from the member reply form, with optional 1–5
   * star rating + short feedback note. The service enforces reporter
   * identity — we don't gate at the controller level so the 403 message
   * comes from one place.
   */
  @Post(':id/close-by-reporter')
  async closeByReporter(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { rating?: number | null; feedback?: string | null },
  ): Promise<Ticket> {
    const user = await this.requireAuth(authHeader);
    return this.ticketsService.closeByReporter(
      id,
      user.id,
      body?.rating ?? undefined,
      body?.feedback ?? undefined,
    );
  }

  /**
   * Place a ticket on hold (paused while waiting on an external party).
   * Admin/staff only. Kept in the active filter group so it stays visible.
   */
  @Post(':id/hold')
  async holdTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<Ticket> {
    await this.requireAdmin(authHeader);
    return this.ticketsService.holdTicket(id);
  }

  @Post(':id/reopen')
  async reopenTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<Ticket> {
    await this.requireAuth(authHeader);
    return this.ticketsService.reopenTicket(id);
  }

  // ==========================================================================
  // Comment Endpoints
  // ==========================================================================

  @Get(':ticketId/comments')
  async getComments(
    @Headers('authorization') authHeader: string,
    @Param('ticketId') ticketId: string,
    @Query('include_internal') includeInternal?: string,
  ): Promise<TicketComment[]> {
    await this.requireAuth(authHeader);
    return this.ticketsService.findCommentsByTicket(
      ticketId,
      includeInternal === 'true',
    );
  }

  @Post(':ticketId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Headers('authorization') authHeader: string,
    @Param('ticketId') ticketId: string,
    @Body() data: Omit<CreateTicketCommentDto, 'ticket_id'>,
  ): Promise<TicketComment> {
    const user = await this.requireAuth(authHeader);
    // Resolve admin/staff flag so the service can auto-transition the ticket
    // to awaiting_response when staff replies (= waiting on customer) and
    // back to in_progress when the customer replies (= waiting on support).
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    const isStaffReply = isAdminUser(profile);
    return this.ticketsService.createComment(
      {
        ...data,
        ticket_id: ticketId,
      },
      isStaffReply,
    );
  }

  @Put('comments/:commentId')
  async updateComment(
    @Headers('authorization') authHeader: string,
    @Param('commentId') commentId: string,
    @Body() data: UpdateTicketCommentDto,
  ): Promise<TicketComment> {
    await this.requireAuth(authHeader);
    return this.ticketsService.updateComment(commentId, data);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Headers('authorization') authHeader: string,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    await this.requireAuth(authHeader);
    return this.ticketsService.deleteComment(commentId);
  }

  // ==========================================================================
  // Attachment Endpoints
  // ==========================================================================

  @Get(':ticketId/attachments')
  async getAttachments(
    @Headers('authorization') authHeader: string,
    @Param('ticketId') ticketId: string,
  ): Promise<TicketAttachment[]> {
    await this.requireAuth(authHeader);
    return this.ticketsService.findAttachmentsByTicket(ticketId);
  }

  /**
   * Proxy a ticket attachment through our own domain. Hides the Supabase
   * Storage hostname AND enforces per-ticket access control (the underlying
   * bucket is public, so the public URL itself is "anyone with the link
   * can view"). Allowed for reporter, assignee, or admins; everyone else
   * gets 403.
   *
   * Uses Express @Res directly so we can set Content-Type +
   * Content-Disposition: inline + private cache headers without fighting
   * the Nest serializer.
   */
  @Get(':ticketId/attachments/:attachmentId/download')
  async downloadAttachment(
    @Headers('authorization') authHeader: string,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.requireAuth(authHeader);
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    const isAdmin = isAdminUser(profile);

    const { data, mimeType, fileName } =
      await this.ticketsService.getAttachmentForDownload(
        ticketId,
        attachmentId,
        user.id,
        isAdmin,
      );

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    // inline so the browser previews images instead of forcing a download;
    // filename* lets non-ASCII names round-trip safely.
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    // Private cache: the response is per-user (it carries auth), so no CDN
    // should ever store it. The short max-age keeps repeat-render thrash
    // off the storage backend.
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(data);
  }

  @Post(':ticketId/attachments')
  @HttpCode(HttpStatus.CREATED)
  async createAttachment(
    @Headers('authorization') authHeader: string,
    @Param('ticketId') ticketId: string,
    @Body() data: Omit<CreateTicketAttachmentDto, 'ticket_id'>,
  ): Promise<TicketAttachment> {
    await this.requireAuth(authHeader);
    return this.ticketsService.createAttachment({
      ...data,
      ticket_id: ticketId,
    });
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Headers('authorization') authHeader: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<void> {
    await this.requireAuth(authHeader);
    return this.ticketsService.deleteAttachment(attachmentId);
  }
}
