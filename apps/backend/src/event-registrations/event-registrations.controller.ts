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
import { EventRegistrationsService } from './event-registrations.service';
import { EventRegistration } from './event-registrations.entity';

@Controller('api/event-registrations')
export class EventRegistrationsController {
  constructor(private readonly eventRegistrationsService: EventRegistrationsService) {}

  @Get()
  async listRegistrations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.eventRegistrationsService.findAll(pageNum, limitNum);
  }

  @Get('event/:eventId')
  async getRegistrationsByEvent(@Param('eventId') eventId: string) {
    return this.eventRegistrationsService.findByEvent(eventId);
  }

  @Get('event/:eventId/count')
  async countRegistrationsByEvent(@Param('eventId') eventId: string) {
    const count = await this.eventRegistrationsService.countByEvent(eventId);
    return { count };
  }

  @Get('user/:userId')
  async getRegistrationsByUser(@Param('userId') userId: string) {
    return this.eventRegistrationsService.findByUser(userId);
  }

  @Get(':id')
  async getRegistration(@Param('id') id: string) {
    const registration = await this.eventRegistrationsService.findById(id);

    if (!registration) {
      throw new NotFoundException(`Event registration with ID ${id} not found`);
    }

    return registration;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRegistration(@Body() data: Partial<EventRegistration>) {
    return this.eventRegistrationsService.create(data);
  }

  @Put(':id')
  async updateRegistration(
    @Param('id') id: string,
    @Body() data: Partial<EventRegistration>,
  ) {
    return this.eventRegistrationsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRegistration(@Param('id') id: string) {
    await this.eventRegistrationsService.delete(id);
  }
}
