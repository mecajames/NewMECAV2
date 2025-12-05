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
import { EventHostingRequestsService } from './event-hosting-requests.service';
import { EventHostingRequest } from './event-hosting-requests.entity';
import { EventHostingRequestMessage, SenderRole, RecipientType } from './event-hosting-request-message.entity';
import { EventHostingRequestStatus, FinalApprovalStatus } from '../types/enums';
import { Profile } from '../profiles/profiles.entity';

@Controller('api/event-hosting-requests')
export class EventHostingRequestsController {
  constructor(
    private readonly eventHostingRequestsService: EventHostingRequestsService,
  ) {}

  // ==================== STATIC ROUTES (MUST BE BEFORE :id ROUTES) ====================

  @Get()
  async listRequests(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: EventHostingRequestStatus,
    @Query('search') search?: string,
  ): Promise<{ data: EventHostingRequest[]; total: number }> {
    return this.eventHostingRequestsService.findAll(page, limit, status, search);
  }

  @Get('stats')
  async getStats(): Promise<{
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
  }> {
    return this.eventHostingRequestsService.getStats();
  }

  @Get('available-event-directors')
  async getAvailableEventDirectors(): Promise<Profile[]> {
    return this.eventHostingRequestsService.getAvailableEventDirectors();
  }

  @Get('user/:userId')
  async getUserRequests(
    @Param('userId') userId: string,
  ): Promise<EventHostingRequest[]> {
    return this.eventHostingRequestsService.findByUserId(userId);
  }

  @Get('event-director/:edId')
  async getEventDirectorRequests(
    @Param('edId') edId: string,
    @Query('status') status?: EventHostingRequestStatus,
  ): Promise<EventHostingRequest[]> {
    return this.eventHostingRequestsService.findByEventDirector(edId, status);
  }

  @Get('event-director/:edId/stats')
  async getEventDirectorStats(
    @Param('edId') edId: string,
  ): Promise<{
    assigned: number;
    pendingReview: number;
    accepted: number;
  }> {
    return this.eventHostingRequestsService.getEventDirectorStats(edId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @Body() data: Partial<EventHostingRequest>,
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.create(data);
  }

  // ==================== PARAMETERIZED :id ROUTES ====================

  @Get(':id')
  async getRequest(@Param('id') id: string): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.findById(id);
  }

  @Put(':id')
  async updateRequest(
    @Param('id') id: string,
    @Body() data: Partial<EventHostingRequest>,
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRequest(@Param('id') id: string): Promise<void> {
    return this.eventHostingRequestsService.delete(id);
  }

  @Post(':id/respond')
  async respondToRequest(
    @Param('id') id: string,
    @Body()
    body: {
      response: string;
      status: EventHostingRequestStatus;
      admin_id: string;
    },
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.respondToRequest(
      id,
      body.response,
      body.status,
      body.admin_id,
    );
  }

  @Post(':id/assign')
  async assignToEventDirector(
    @Param('id') id: string,
    @Body()
    body: {
      event_director_id: string;
      admin_id: string;
      notes?: string;
    },
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.assignToEventDirector(
      id,
      body.event_director_id,
      body.admin_id,
      body.notes,
    );
  }

  @Post(':id/reassign')
  async reassignEventDirector(
    @Param('id') id: string,
    @Body()
    body: {
      new_event_director_id: string;
      admin_id: string;
      notes?: string;
    },
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.reassignEventDirector(
      id,
      body.new_event_director_id,
      body.admin_id,
      body.notes,
    );
  }

  @Post(':id/revoke-assignment')
  async revokeEDAssignment(
    @Param('id') id: string,
    @Body()
    body: {
      admin_id: string;
      reason?: string;
    },
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.revokeEDAssignment(
      id,
      body.admin_id,
      body.reason,
    );
  }

  @Post(':id/ed-accept')
  async edAcceptAssignment(
    @Param('id') id: string,
    @Body()
    body: {
      event_director_id: string;
    },
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.edAcceptAssignment(
      id,
      body.event_director_id,
    );
  }

  @Post(':id/ed-reject')
  async edRejectAssignment(
    @Param('id') id: string,
    @Body()
    body: {
      event_director_id: string;
      reason: string;
    },
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.edRejectAssignment(
      id,
      body.event_director_id,
      body.reason,
    );
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('viewer_role') viewerRole: 'requestor' | 'event_director' | 'admin' = 'requestor',
  ): Promise<EventHostingRequestMessage[]> {
    return this.eventHostingRequestsService.getMessages(id, viewerRole);
  }

  @Post(':id/messages')
  async addMessage(
    @Param('id') id: string,
    @Body()
    body: {
      sender_id: string;
      sender_role: SenderRole;
      message: string;
      is_private?: boolean;
      recipient_type?: RecipientType;
    },
  ): Promise<EventHostingRequestMessage> {
    return this.eventHostingRequestsService.addMessage(
      id,
      body.sender_id,
      body.sender_role,
      body.message,
      body.is_private || false,
      body.recipient_type,
    );
  }

  @Post(':id/final-approval')
  async setFinalApproval(
    @Param('id') id: string,
    @Body()
    body: {
      admin_id: string;
      final_status: FinalApprovalStatus;
      reason?: string;
    },
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.setFinalApproval(
      id,
      body.admin_id,
      body.final_status,
      body.reason,
    );
  }

  @Post(':id/request-info')
  async requestFurtherInfo(
    @Param('id') id: string,
    @Body()
    body: {
      sender_id: string;
      sender_role: SenderRole;
      message: string;
    },
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.requestFurtherInfo(
      id,
      body.sender_id,
      body.sender_role,
      body.message,
    );
  }

  @Post(':id/requestor-respond')
  async requestorRespond(
    @Param('id') id: string,
    @Body()
    body: {
      requestor_id: string;
      message: string;
    },
  ): Promise<EventHostingRequestMessage> {
    return this.eventHostingRequestsService.requestorRespond(
      id,
      body.requestor_id,
      body.message,
    );
  }
}
