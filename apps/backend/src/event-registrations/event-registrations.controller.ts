import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { EventRegistrationsService } from './event-registrations.service';
import { EventRegistration } from './event-registrations.entity';

@Controller('api/event-registrations')
export class EventRegistrationsController {
  constructor(private readonly eventRegistrationsService: EventRegistrationsService) {}

  @Get(':id')
  async getRegistration(@Param('id') id: string): Promise<EventRegistration> {
    return this.eventRegistrationsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRegistration(@Body() data: Partial<EventRegistration>): Promise<EventRegistration> {
    return this.eventRegistrationsService.create(data);
  }

  @Put(':id')
  async updateRegistration(
    @Param('id') id: string,
    @Body() data: Partial<EventRegistration>,
  ): Promise<EventRegistration> {
    return this.eventRegistrationsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRegistration(@Param('id') id: string): Promise<void> {
    return this.eventRegistrationsService.delete(id);
  }

  @Post(':id/confirm')
  async confirmRegistration(@Param('id') id: string): Promise<EventRegistration> {
    return this.eventRegistrationsService.confirmRegistration(id);
  }

  @Post(':id/cancel')
  async cancelRegistration(@Param('id') id: string): Promise<EventRegistration> {
    return this.eventRegistrationsService.cancelRegistration(id);
  }
}
