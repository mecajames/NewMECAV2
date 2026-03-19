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
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
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
    await this.requireAuth(authHeader);
    return this.ticketsService.update(id, data);
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
    await this.requireAuth(authHeader);
    return this.ticketsService.createComment({
      ...data,
      ticket_id: ticketId,
    });
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
