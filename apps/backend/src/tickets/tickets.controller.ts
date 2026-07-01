import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserRole } from '@newmeca/shared';
import { TicketsService } from './tickets.service';
import { TicketConfigSyncService } from './ticket-config-sync.service';
import { TicketStaffSetupService } from './ticket-staff-setup.service';
import { TicketCustomFieldsService } from './ticket-custom-fields.service';
import { TicketPurchasesService } from './ticket-purchases.service';
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
  TicketStatus,
} from '@newmeca/shared';

@Controller('api/tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly configSyncService: TicketConfigSyncService,
    private readonly staffSetupService: TicketStaffSetupService,
    private readonly customFieldsService: TicketCustomFieldsService,
    private readonly purchasesService: TicketPurchasesService,
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
    @Query('last_reply_by') last_reply_by?: string,
    @Query('waiting_on') waiting_on?: string,
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
      last_reply_by: (last_reply_by as any) || undefined,
      waiting_on: (waiting_on as any) || undefined,
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

  // The current member's purchases (for the purchase_reference form field).
  // Declared before :id so it isn't swallowed by the param route.
  @Get('my-purchases')
  async getMyPurchases(@Headers('authorization') authHeader: string) {
    const user = await this.requireAuth(authHeader);
    return this.purchasesService.getForUser(user.id);
  }

  @Get(':id')
  async getTicket(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<any> {
    await this.requireAuth(authHeader);
    const ticket = await this.ticketsService.findById(id);
    // Attach the submitter's answers to admin-defined custom fields so the
    // detail view (member + admin) can render them.
    const customFieldAnswers = await this.customFieldsService.getAnswersForTicket(id);
    return { ...ticket.toJSON(), custom_field_answers: customFieldAnswers };
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
    @Req() req: Request,
  ): Promise<Ticket> {
    await this.requireAuth(authHeader);
    const { user_membership_status, ...ticketData } = data;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    return this.ticketsService.create(ticketData, user_membership_status, { ipAddress, userAgent });
  }

  /**
   * Admin-only "User Report": everything we know about whoever filed this
   * ticket — works for guests (matched by guest_email) and members alike.
   * Includes linked account + membership status/expiry, last login, and the
   * IP/user-agent captured at ticket submission.
   */
  @Get(':id/user-report')
  async getUserReport(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.ticketsService.getTicketUserReport(id);
  }

  /**
   * OWNER-ONLY (James, MECA 202401): sync this environment's ticket
   * configuration (departments, categories, routing) to the canonical seed and
   * move any tickets out of departments that get deactivated. Pass
   * ?dryRun=true (default) for a no-write PREVIEW that returns the exact report
   * of what would change; ?dryRun=false to APPLY. Idempotent.
   */
  @Post('admin/config-sync')
  @HttpCode(HttpStatus.OK)
  async syncTicketConfig(
    @Headers('authorization') authHeader: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    if (String((profile as any)?.meca_id) !== '202401') {
      throw new ForbiddenException('This action is restricted to the system owner (MECA 202401).');
    }
    // Safe default: preview unless explicitly told to apply.
    const isDryRun = dryRun !== 'false';
    return this.configSyncService.syncTicketConfig(profile!.id, { dryRun: isDryRun });
  }

  /**
   * OWNER-ONLY (James, MECA 202401): apply the canonical staff configuration —
   * the 5 staff + roles, their department assignments (with head flags), the
   * per-department default assignee, and the event-picker custom field — from
   * ticket-staff-seed.ts. Matches people to prod profiles by email. Pass
   * ?dryRun=true (default) for a no-write PREVIEW; ?dryRun=false to APPLY.
   * Idempotent. Requires config-sync to have run first (departments/categories)
   * and the ticket_departments.default_assignee_id migration to be applied.
   */
  @Post('admin/staff-setup')
  @HttpCode(HttpStatus.OK)
  async applyStaffSetup(
    @Headers('authorization') authHeader: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    if (String((profile as any)?.meca_id) !== '202401') {
      throw new ForbiddenException('This action is restricted to the system owner (MECA 202401).');
    }
    const isDryRun = dryRun !== 'false';
    return this.staffSetupService.applyStaffSetup(profile!.id, { dryRun: isDryRun });
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
    const user = await this.requireAuth(authHeader);
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    const isAdmin = isAdminUser(profile);
    return this.ticketsService.reopenTicket(id, user.id, isAdmin);
  }

  /**
   * Admin-only: set (hours > 0) or clear (hours <= 0) a per-reply auto-close
   * countdown. The ticket auto-closes after `hours` if the customer doesn't
   * reply first (a customer reply clears it).
   */
  @Post(':id/auto-close-timer')
  async setAutoCloseTimer(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { hours: number },
  ): Promise<Ticket> {
    await this.requireAdmin(authHeader);
    return this.ticketsService.setAutoCloseTimer(id, Number(body?.hours) || 0);
  }

  /**
   * Admin-only "Change Status" endpoint backing the status dropdown on the
   * ticket detail page. The service validates the transition against
   * TICKET_STATUS_TRANSITIONS and stamps resolved_at / closed_at as needed.
   */
  @Patch(':id/status')
  async changeStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { status: TicketStatus },
  ): Promise<Ticket> {
    await this.requireAdmin(authHeader);
    if (!body || !body.status) {
      throw new BadRequestException('Request body must include a "status" field.');
    }
    const validValues = Object.values(TicketStatus) as string[];
    if (!validValues.includes(body.status)) {
      throw new BadRequestException(
        `Invalid status "${body.status}". Must be one of: ${validValues.join(', ')}.`,
      );
    }
    return this.ticketsService.changeStatus(id, body.status);
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
      data.skip_signature ?? false,
    );
  }

  @Put('comments/:commentId')
  async updateComment(
    @Headers('authorization') authHeader: string,
    @Param('commentId') commentId: string,
    @Body() data: UpdateTicketCommentDto,
  ): Promise<TicketComment> {
    const user = await this.requireAuth(authHeader);
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    // Pass the editor's identity so the service can enforce that staff edit
    // only their OWN replies (and re-sanitize the HTML).
    return this.ticketsService.updateComment(commentId, data, {
      editorId: user.id,
      isStaff: isAdminUser(profile),
    });
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
