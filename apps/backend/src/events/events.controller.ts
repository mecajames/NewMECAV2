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
  HttpStatus 
} from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './events.entity';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async listEvents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('season_id') seasonId?: string,
  ): Promise<Event[]> {
    if (seasonId) {
      return this.eventsService.findBySeason(seasonId, page, limit);
    }
    return this.eventsService.findAll(page, limit);
  }

  @Get('stats')
  async getStats(): Promise<{ totalEvents: number }> {
    return this.eventsService.getStats();
  }

  @Get('upcoming')
  async getUpcomingEvents(): Promise<Event[]> {
    return this.eventsService.findUpcoming();
  }

  @Get(':id')
  async getEvent(@Param('id') id: string): Promise<Event> {
    return this.eventsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() data: Partial<Event>): Promise<Event> {
    return this.eventsService.create(data);
  }

  @Put(':id')
  async updateEvent(
    @Param('id') id: string,
    @Body() data: Partial<Event>,
  ): Promise<Event> {
    return this.eventsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('id') id: string): Promise<void> {
    return this.eventsService.delete(id);
  }
}
