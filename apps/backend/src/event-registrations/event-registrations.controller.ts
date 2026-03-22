// Event registrations controller with interest endpoints
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { EventRegistrationsService, CreateRegistrationDto, AdminListFilters, CheckInResponse } from './event-registrations.service';
import { ScoreSheetService } from './score-sheets/score-sheet.service';
import { EventRegistration } from './event-registrations.entity';
import { RegistrationStatus, PaymentStatus, UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Public } from '../auth/public.decorator';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Controller('api/event-registrations')
export class EventRegistrationsController {
  constructor(
    private readonly eventRegistrationsService: EventRegistrationsService,
    private readonly scoreSheetService: ScoreSheetService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  // ========================
  // Interest Endpoints (must be before :id routes)
  // ========================

  @Post('interest/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleInterest(
    @Headers('authorization') authHeader: string,
    @Body('eventId') eventId: string,
  ): Promise<{ interested: boolean }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    return this.eventRegistrationsService.toggleInterest(eventId, user.id);
  }

  @Public()
  @Post('interest/guest')
  @HttpCode(HttpStatus.OK)
  async guestInterest(
    @Body('eventId') eventId: string,
    @Body('email') email: string,
    @Body('firstName') firstName?: string,
  ): Promise<{ interested: boolean; requiresVerification: boolean }> {
    return this.eventRegistrationsService.addGuestInterest(eventId, email, firstName);
  }

  @Public()
  @Get('interest/verify')
  async verifyGuestInterest(
    @Query('token') token: string,
    @Query('firstName') firstName: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const { eventId } = await this.eventRegistrationsService.verifyGuestInterest(token, firstName);
      res.redirect(`${frontendUrl}/events/${eventId}?interest_verified=true`);
    } catch (error: any) {
      const errorType = error?.message || 'invalid';
      // Try to extract eventId from the token for redirect even on error
      let redirectPath = '/events';
      try {
        const em = this.em.fork();
        const { EmailVerificationToken } = await import('../auth/email-verification-token.entity');
        const tokenRecord = await em.findOne(EmailVerificationToken, { token });
        if (tokenRecord) {
          redirectPath = `/events/${tokenRecord.relatedEntityId}`;
        }
      } catch {
        // Fall back to /events if we can't look up the token
      }
      res.redirect(`${frontendUrl}${redirectPath}?interest_error=${errorType}`);
    }
  }

  @Public()
  @Get('interest/check')
  async checkInterest(
    @Query('eventId') eventId: string,
    @Query('userId') userId: string,
  ): Promise<{ interested: boolean }> {
    return this.eventRegistrationsService.checkInterest(eventId, userId);
  }

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

  @Public()
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
    @Headers('authorization') authHeader: string,
    @Query('eventId') eventId?: string,
    @Query('seasonId') seasonId?: string,
    @Query('status') status?: RegistrationStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('checkedIn') checkedIn?: string,
    @Query('registrationType') registrationType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.requireAdmin(authHeader);
    const filters: AdminListFilters = {
      eventId,
      seasonId,
      status,
      paymentStatus,
      checkedIn: checkedIn !== undefined ? checkedIn === 'true' : undefined,
      registrationType: registrationType as any,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.eventRegistrationsService.adminList(filters);
  }

  // ========================
  // Score Sheet Template Editor (must be before admin/:id)
  // ========================

  @Get('admin/score-sheet-templates')
  async getScoreSheetTemplates(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.scoreSheetService.getTemplateConfigs();
  }

  @Get('admin/score-sheet-image/:key')
  async getScoreSheetTemplateImage(
    @Headers('authorization') authHeader: string,
    @Param('key') key: string,
    @Res() res: Response,
  ) {
    await this.requireAdmin(authHeader);
    const image = this.scoreSheetService.getTemplateImage(key);
    if (!image) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }
    res.set({ 'Content-Type': 'image/png', 'Content-Length': String(image.length) });
    res.end(image);
  }

  @Put('admin/score-sheet-coords/:key')
  async saveScoreSheetCoords(
    @Headers('authorization') authHeader: string,
    @Param('key') key: string,
    @Body() coords: any,
  ) {
    await this.requireAdmin(authHeader);
    await this.scoreSheetService.saveTemplateCoords(key, coords);
    return { success: true };
  }

  @Post('admin/score-sheet-upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadScoreSheetTemplate(
    @Headers('authorization') authHeader: string,
    @UploadedFile() file: any,
    @Body('key') key: string,
    @Body('name') name: string,
  ) {
    await this.requireAdmin(authHeader);
    if (!file || !key) {
      return { success: false, message: 'Image file and template key are required' };
    }
    await this.scoreSheetService.uploadTemplateImage(key, file.buffer, name);
    return { success: true, key };
  }

  @Get('admin/score-sheet-mappings')
  async getScoreSheetMappings(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.scoreSheetService.getMappings();
  }

  @Put('admin/score-sheet-mappings')
  async saveScoreSheetMappings(
    @Headers('authorization') authHeader: string,
    @Body() mappings: any,
  ) {
    await this.requireAdmin(authHeader);
    await this.scoreSheetService.saveMappings(mappings);
    return { success: true };
  }

  @Get('admin/:id')
  async adminGetRegistration(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<EventRegistration> {
    await this.requireAdmin(authHeader);
    return this.eventRegistrationsService.findById(id);
  }

  @Post('admin/:id/cancel')
  async adminCancelRegistration(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<EventRegistration> {
    await this.requireAdmin(authHeader);
    return this.eventRegistrationsService.cancelRegistration(id);
  }

  @Post('admin/:id/refund')
  async adminProcessRefund(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<EventRegistration> {
    await this.requireAdmin(authHeader);
    return this.eventRegistrationsService.processRefund(id);
  }

  @Get('admin/event/:eventId/stats')
  async getEventCheckInStats(
    @Headers('authorization') authHeader: string,
    @Param('eventId') eventId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.eventRegistrationsService.getEventCheckInStats(eventId);
  }

  @Get('admin/event/:eventId/registrations')
  async getEventRegistrations(
    @Headers('authorization') authHeader: string,
    @Param('eventId') eventId: string,
  ): Promise<EventRegistration[]> {
    await this.requireAdmin(authHeader);
    return this.eventRegistrationsService.findByEvent(eventId);
  }

  // ========================
  // Score Sheet Endpoints
  // ========================

  @Get('admin/event/:eventId/score-sheets')
  async getEventScoreSheets(
    @Headers('authorization') authHeader: string,
    @Param('eventId') eventId: string,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    await this.requireAdmin(authHeader);
    const pdf = await this.scoreSheetService.generateForEvent(eventId, format);
    const filename = format
      ? `score-sheets-event-${eventId.slice(0, 8)}-${format}.pdf`
      : `score-sheets-event-${eventId.slice(0, 8)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Get('admin/:id/score-sheets')
  async getRegistrationScoreSheets(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    await this.requireAdmin(authHeader);
    try {
      const pdf = await this.scoreSheetService.generateForRegistration(id);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="score-sheets-${id.slice(0, 8)}.pdf"`,
        'Content-Length': String(pdf.length),
      });
      res.end(pdf);
    } catch (err: any) {
      console.error('Score sheet generation error:', err?.message, err?.stack);
      res.status(err?.status || 500).json({ message: err?.message || 'Score sheet generation failed' });
    }
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
