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
import { EventHostingRequestStatus } from '../types/enums';

@Controller('api/event-hosting-requests')
export class EventHostingRequestsController {
  constructor(
    private readonly eventHostingRequestsService: EventHostingRequestsService,
  ) {}

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

  @Get('user/:userId')
  async getUserRequests(
    @Param('userId') userId: string,
  ): Promise<EventHostingRequest[]> {
    return this.eventHostingRequestsService.findByUserId(userId);
  }

  @Get(':id')
  async getRequest(@Param('id') id: string): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @Body() data: Partial<EventHostingRequest>,
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.create(data);
  }

  @Put(':id')
  async updateRequest(
    @Param('id') id: string,
    @Body() data: Partial<EventHostingRequest>,
  ): Promise<EventHostingRequest> {
    return this.eventHostingRequestsService.update(id, data);
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRequest(@Param('id') id: string): Promise<void> {
    return this.eventHostingRequestsService.delete(id);
  }
}
