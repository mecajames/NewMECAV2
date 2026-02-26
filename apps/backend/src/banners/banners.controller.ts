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
  Headers,
  Res,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { BannersService } from './banners.service';
import { BannerReportService } from './banner-report.service';
import { EmailService } from '../email/email.service';
import {
  BannerPosition,
  BannerSize,
  CreateBannerDto,
  UpdateBannerDto,
  RecordEngagementDto,
  SendBannerReportRequest,
  UserRole,
} from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { Advertiser } from './entities/advertiser.entity';

@Controller('api')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly bannerReportService: BannerReportService,
    private readonly emailService: EmailService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

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

    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return { user, profile };
  }

  // =============================================================================
  // PUBLIC ENDPOINTS (no auth required)
  // =============================================================================

  @Get('banners/active/:position')
  async getActiveBanner(@Param('position') position: BannerPosition) {
    return this.bannersService.getActiveBanner(position);
  }

  @Get('banners/active/:position/all')
  async getAllActiveBanners(@Param('position') position: BannerPosition) {
    return this.bannersService.getAllActiveBanners(position);
  }

  @Post('banners/engagement')
  @HttpCode(HttpStatus.OK)
  async recordEngagement(@Body() dto: RecordEngagementDto) {
    try {
      await this.bannersService.recordEngagement(dto.bannerId, dto.type);
    } catch (error) {
      // Silently fail - engagement tracking shouldn't break the user experience
      console.error('Failed to record banner engagement:', error);
    }
    return { success: true };
  }

  // =============================================================================
  // ADMIN ENDPOINTS
  // =============================================================================

  @Get('admin/banners')
  async findAll(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.bannersService.findAll();
  }

  @Post('admin/banners/auto-detect-sizes')
  async autoDetectBannerSizes(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.bannersService.autoDetectBannerSizes();
  }

  @Get('admin/banners/analytics/all')
  async getAllBannersAnalytics(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.bannersService.getAllBannersAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('admin/banners/analytics/filtered')
  async getFilteredBannersAnalytics(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('advertiserId') advertiserId?: string,
    @Query('size') size?: BannerSize,
  ) {
    await this.requireAdmin(authHeader);
    return this.bannersService.getFilteredBannersAnalytics({
      startDate,
      endDate,
      advertiserId,
      size,
    });
  }

  @Get('admin/banners/analytics/report')
  async getBannerReport(
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
    @Query('advertiserId') advertiserId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('size') size?: BannerSize,
  ) {
    await this.requireAdmin(authHeader);

    if (!advertiserId || !startDate || !endDate) {
      throw new BadRequestException('advertiserId, startDate, and endDate are required');
    }

    const em = this.em.fork();
    const advertiser = await em.findOne(Advertiser, { id: advertiserId });
    if (!advertiser) {
      throw new NotFoundException(`Advertiser with ID ${advertiserId} not found`);
    }

    const analytics = await this.bannersService.getFilteredBannersAnalytics({
      startDate,
      endDate,
      advertiserId,
      size,
    });

    const html = this.bannerReportService.generateReportHtml(
      advertiser.companyName,
      analytics,
      startDate,
      endDate,
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Post('admin/banners/analytics/email-report')
  async sendBannerReport(
    @Headers('authorization') authHeader: string,
    @Body() dto: SendBannerReportRequest,
  ) {
    await this.requireAdmin(authHeader);

    const em = this.em.fork();
    const advertiser = await em.findOne(Advertiser, { id: dto.advertiserId });
    if (!advertiser) {
      throw new NotFoundException(`Advertiser with ID ${dto.advertiserId} not found`);
    }

    if (!advertiser.contactEmail) {
      throw new BadRequestException('Advertiser does not have a contact email');
    }

    const analytics = await this.bannersService.getFilteredBannersAnalytics({
      startDate: dto.startDate,
      endDate: dto.endDate,
      advertiserId: dto.advertiserId,
      size: dto.size,
    });

    const html = this.bannerReportService.generateReportHtml(
      advertiser.companyName,
      analytics,
      dto.startDate,
      dto.endDate,
    );

    const formatDate = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const result = await this.emailService.sendEmail({
      to: advertiser.contactEmail,
      subject: `MECA Banner Analytics Report — ${formatDate(dto.startDate)} to ${formatDate(dto.endDate)}`,
      html,
    });

    if (!result.success) {
      throw new BadRequestException(result.error || 'Failed to send email');
    }

    return { success: true, sentTo: advertiser.contactEmail };
  }

  @Get('admin/banners/:id')
  async findOne(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.bannersService.findOne(id);
  }

  @Get('admin/banners/:id/analytics')
  async getBannerAnalytics(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.bannersService.getBannerAnalytics(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('admin/banners')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateBannerDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.bannersService.create(dto);
  }

  @Put('admin/banners/:id')
  async update(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.bannersService.update(id, dto);
  }

  @Delete('admin/banners/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.bannersService.delete(id);
  }
}
