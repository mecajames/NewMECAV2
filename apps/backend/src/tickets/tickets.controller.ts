import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { TicketAttachment } from './ticket-attachment.entity';
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
  constructor(private readonly ticketsService: TicketsService) {}

  // ==========================================================================
  // Ticket Endpoints
  // ==========================================================================

  @Get()
  async listTickets(
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
  async getStats(): Promise<any> {
    return this.ticketsService.getStats();
  }

  @Get('my-tickets/:userId')
  async getMyTickets(@Param('userId') userId: string): Promise<Ticket[]> {
    return this.ticketsService.getMyTickets(userId);
  }

  @Get('assigned/:userId')
  async getAssignedTickets(@Param('userId') userId: string): Promise<Ticket[]> {
    return this.ticketsService.getAssignedTickets(userId);
  }

  @Get('staff/:profileId')
  async getTicketsForStaff(
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
  async getByTicketNumber(@Param('ticketNumber') ticketNumber: string): Promise<Ticket> {
    return this.ticketsService.findByTicketNumber(ticketNumber);
  }

  @Get(':id')
  async getTicket(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() data: CreateTicketDto & { user_membership_status?: string },
  ): Promise<Ticket> {
    const { user_membership_status, ...ticketData } = data;
    return this.ticketsService.create(ticketData, user_membership_status);
  }

  @Put(':id')
  async updateTicket(
    @Param('id') id: string,
    @Body() data: UpdateTicketDto,
  ): Promise<Ticket> {
    return this.ticketsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTicket(@Param('id') id: string): Promise<void> {
    return this.ticketsService.delete(id);
  }

  // Ticket Status Actions
  @Post(':id/assign')
  async assignTicket(
    @Param('id') id: string,
    @Body('assigned_to_id') assignedToId: string,
  ): Promise<Ticket> {
    return this.ticketsService.assignTicket(id, assignedToId);
  }

  @Post(':id/resolve')
  async resolveTicket(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.resolveTicket(id);
  }

  @Post(':id/close')
  async closeTicket(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.closeTicket(id);
  }

  @Post(':id/reopen')
  async reopenTicket(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.reopenTicket(id);
  }

  // ==========================================================================
  // Comment Endpoints
  // ==========================================================================

  @Get(':ticketId/comments')
  async getComments(
    @Param('ticketId') ticketId: string,
    @Query('include_internal') includeInternal?: string,
  ): Promise<TicketComment[]> {
    return this.ticketsService.findCommentsByTicket(
      ticketId,
      includeInternal === 'true',
    );
  }

  @Post(':ticketId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('ticketId') ticketId: string,
    @Body() data: Omit<CreateTicketCommentDto, 'ticket_id'>,
  ): Promise<TicketComment> {
    return this.ticketsService.createComment({
      ...data,
      ticket_id: ticketId,
    });
  }

  @Put('comments/:commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() data: UpdateTicketCommentDto,
  ): Promise<TicketComment> {
    return this.ticketsService.updateComment(commentId, data);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Param('commentId') commentId: string): Promise<void> {
    return this.ticketsService.deleteComment(commentId);
  }

  // ==========================================================================
  // Attachment Endpoints
  // ==========================================================================

  @Get(':ticketId/attachments')
  async getAttachments(@Param('ticketId') ticketId: string): Promise<TicketAttachment[]> {
    return this.ticketsService.findAttachmentsByTicket(ticketId);
  }

  @Post(':ticketId/attachments')
  @HttpCode(HttpStatus.CREATED)
  async createAttachment(
    @Param('ticketId') ticketId: string,
    @Body() data: Omit<CreateTicketAttachmentDto, 'ticket_id'>,
  ): Promise<TicketAttachment> {
    return this.ticketsService.createAttachment({
      ...data,
      ticket_id: ticketId,
    });
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(@Param('attachmentId') attachmentId: string): Promise<void> {
    return this.ticketsService.deleteAttachment(attachmentId);
  }
}
