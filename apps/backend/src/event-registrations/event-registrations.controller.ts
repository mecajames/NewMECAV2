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
import { EventRegistrationsService, CreateRegistrationDto, AdminListFilters, CheckInResponse } from './event-registrations.service';
import { EventRegistration } from './event-registrations.entity';
import { RegistrationStatus, PaymentStatus } from '@newmeca/shared';

@Controller('api/event-registrations')
export class EventRegistrationsController {
  constructor(private readonly eventRegistrationsService: EventRegistrationsService) {}

  // ========================
  // Public Endpoints
  // ========================

  @Get('stats')
  async getStats(): Promise<{ totalRegistrations: number }> {
    return this.eventRegistrationsService.getStats();
  }

  @Get('count/:eventId')
  async getRegistrationCount(@Param('eventId') eventId: string): Promise<{ count: number }> {
    return this.eventRegistrationsService.getCountByEvent(eventId);
  }

  @Get('pricing')
  async calculatePricing(
    @Query('eventId') eventId: string,
    @Query('classCount') classCount: string,
    @Query('isMember') isMember: string,
    @Query('includeMembership') includeMembership?: string,
    @Query('membershipPrice') membershipPrice?: string,
  ) {
    return this.eventRegistrationsService.calculatePricing(
      eventId,
      parseInt(classCount, 10),
      isMember === 'true',
      includeMembership === 'true',
      membershipPrice ? parseFloat(membershipPrice) : 0,
    );
  }

  @Get('my')
  async getMyRegistrations(@Query('userId') userId: string): Promise<EventRegistration[]> {
    return this.eventRegistrationsService.findByUser(userId);
  }

  @Get('by-email')
  async getByEmail(@Query('email') email: string): Promise<EventRegistration[]> {
    return this.eventRegistrationsService.findByEmail(email);
  }

  @Get(':id')
  async getRegistration(@Param('id') id: string): Promise<EventRegistration> {
    return this.eventRegistrationsService.findById(id);
  }

  @Get(':id/qr-code')
  async getQrCode(@Param('id') id: string): Promise<{ checkInCode: string; qrCodeData: string }> {
    return this.eventRegistrationsService.getQrCode(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRegistration(@Body() data: Partial<EventRegistration>): Promise<EventRegistration> {
    return this.eventRegistrationsService.create(data);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async createCheckoutRegistration(
    @Body() dto: CreateRegistrationDto & { isMember: boolean },
  ): Promise<EventRegistration> {
    return this.eventRegistrationsService.createRegistration(dto, dto.isMember);
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

  // ========================
  // Check-in Endpoints
  // ========================

  @Get('check-in/:code')
  async lookupByCheckInCode(@Param('code') code: string): Promise<CheckInResponse> {
    return this.eventRegistrationsService.lookupByCheckInCode(code);
  }

  @Post('check-in/:code')
  async checkIn(
    @Param('code') code: string,
    @Body('checkedInById') checkedInById: string,
  ): Promise<CheckInResponse> {
    return this.eventRegistrationsService.checkIn(code, checkedInById);
  }

  // ========================
  // Admin Endpoints
  // ========================

  @Get('admin/list')
  async adminList(
    @Query('eventId') eventId?: string,
    @Query('status') status?: RegistrationStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('checkedIn') checkedIn?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: AdminListFilters = {
      eventId,
      status,
      paymentStatus,
      checkedIn: checkedIn !== undefined ? checkedIn === 'true' : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.eventRegistrationsService.adminList(filters);
  }

  @Get('admin/:id')
  async adminGetRegistration(@Param('id') id: string): Promise<EventRegistration> {
    return this.eventRegistrationsService.findById(id);
  }

  @Post('admin/:id/cancel')
  async adminCancelRegistration(@Param('id') id: string): Promise<EventRegistration> {
    return this.eventRegistrationsService.cancelRegistration(id);
  }

  @Post('admin/:id/refund')
  async adminProcessRefund(@Param('id') id: string): Promise<EventRegistration> {
    return this.eventRegistrationsService.processRefund(id);
  }

  @Get('admin/event/:eventId/stats')
  async getEventCheckInStats(@Param('eventId') eventId: string) {
    return this.eventRegistrationsService.getEventCheckInStats(eventId);
  }

  @Get('admin/event/:eventId/registrations')
  async getEventRegistrations(@Param('eventId') eventId: string): Promise<EventRegistration[]> {
    return this.eventRegistrationsService.findByEvent(eventId);
  }

  // ========================
  // User Account Linking
  // ========================

  @Post('link-to-user')
  async linkRegistrationsToUser(
    @Body('email') email: string,
    @Body('userId') userId: string,
  ): Promise<{ linked: number }> {
    const linked = await this.eventRegistrationsService.linkRegistrationsToUser(email, userId);
    return { linked };
  }
}
