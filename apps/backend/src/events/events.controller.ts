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
  NotFoundException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './events.entity';
import { EventStatus } from '../types/enums';

/**
 * EventsController
 *
 * Handles HTTP requests for event operations.
 * Routes are automatically registered by NestJS from decorators.
 *
 * All routes are prefixed with /api/events
 */
@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/events
   * List all events with pagination
   */
  @Get()
  async listEvents(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.eventsService.findAll(pageNum, limitNum);
  }

  /**
   * GET /api/events/upcoming
   * Get upcoming events
   */
  @Get('upcoming')
  async getUpcomingEvents() {
    return this.eventsService.findUpcoming();
  }

  /**
   * GET /api/events/status/:status
   * Get events by status
   */
  @Get('status/:status')
  async getEventsByStatus(@Param('status') status: string) {
    return this.eventsService.findByStatus(status as EventStatus);
  }

  /**
   * GET /api/events/director/:directorId
   * Get events by director
   */
  @Get('director/:directorId')
  async getEventsByDirector(@Param('directorId') directorId: string) {
    return this.eventsService.findByDirector(directorId);
  }

  /**
   * GET /api/events/:id
   * Get single event by ID
   */
  @Get(':id')
  async getEvent(@Param('id') id: string) {
    const event = await this.eventsService.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  /**
   * POST /api/events
   * Create new event
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() data: Partial<Event>) {
    return this.eventsService.create(data);
  }

  /**
   * PUT /api/events/:id
   * Update existing event
   */
  @Put(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body() data: Partial<Event>,
  ) {
    return this.eventsService.update(id, data);
  }

  /**
   * DELETE /api/events/:id
   * Delete event
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('id') id: string) {
    await this.eventsService.delete(id);
  }
}
