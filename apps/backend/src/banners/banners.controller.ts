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
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BannersService } from './banners.service';
import {
  BannerPosition,
  CreateBannerDto,
  UpdateBannerDto,
  RecordEngagementDto,
  UserRole,
} from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';

@Controller('api')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
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
    await this.bannersService.recordEngagement(dto.bannerId, dto.type);
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
