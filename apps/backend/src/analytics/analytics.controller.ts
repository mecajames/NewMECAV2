import {
  Controller,
  Get,
  Post,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';
import { AnalyticsService } from './analytics.service';
import { SearchConsoleService } from './search-console.service';

@Controller('api/admin/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly searchConsoleService: SearchConsoleService,
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

  @Get('status')
  async getStatus(
    @Headers('authorization') authHeader: string,
  ): Promise<{ configured: boolean }> {
    await this.requireAdmin(authHeader);
    return { configured: this.analyticsService.isConfigured() };
  }

  @Get('dashboard')
  async getDashboard(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate = '30daysAgo',
    @Query('endDate') endDate = 'today',
  ) {
    await this.requireAdmin(authHeader);
    if (!this.analyticsService.isConfigured()) {
      throw new InternalServerErrorException('Google Analytics is not configured');
    }
    return this.analyticsService.getDashboard(startDate, endDate);
  }

  @Get('page-views')
  async getPageViews(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate = '30daysAgo',
    @Query('endDate') endDate = 'today',
  ) {
    await this.requireAdmin(authHeader);
    if (!this.analyticsService.isConfigured()) {
      throw new InternalServerErrorException('Google Analytics is not configured');
    }
    return this.analyticsService.getPageViewsOverTime(startDate, endDate);
  }

  @Get('top-pages')
  async getTopPages(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate = '30daysAgo',
    @Query('endDate') endDate = 'today',
    @Query('limit') limit = 10,
  ) {
    await this.requireAdmin(authHeader);
    if (!this.analyticsService.isConfigured()) {
      throw new InternalServerErrorException('Google Analytics is not configured');
    }
    return this.analyticsService.getTopPages(startDate, endDate, Number(limit));
  }

  @Get('traffic-sources')
  async getTrafficSources(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate = '30daysAgo',
    @Query('endDate') endDate = 'today',
  ) {
    await this.requireAdmin(authHeader);
    if (!this.analyticsService.isConfigured()) {
      throw new InternalServerErrorException('Google Analytics is not configured');
    }
    return this.analyticsService.getTrafficSources(startDate, endDate);
  }

  @Get('devices')
  async getDevices(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate = '30daysAgo',
    @Query('endDate') endDate = 'today',
  ) {
    await this.requireAdmin(authHeader);
    if (!this.analyticsService.isConfigured()) {
      throw new InternalServerErrorException('Google Analytics is not configured');
    }
    return this.analyticsService.getDeviceCategories(startDate, endDate);
  }

  // =============================================================================
  // SEARCH CONSOLE ENDPOINTS
  // =============================================================================

  @Get('search-console/status')
  async getSearchConsoleStatus(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return { configured: this.searchConsoleService.isConfigured() };
  }

  @Get('search-console/dashboard')
  async getSearchConsoleDashboard(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.requireAdmin(authHeader);
    if (!this.searchConsoleService.isConfigured()) {
      throw new InternalServerErrorException('Google Search Console is not configured');
    }

    // Default to last 28 days (Search Console data has a 2-3 day delay)
    const end = endDate || new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 31 * 86400000).toISOString().split('T')[0];

    return this.searchConsoleService.getDashboard(start, end);
  }

  @Get('search-console/queries')
  async getSearchConsoleQueries(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit = 50,
  ) {
    await this.requireAdmin(authHeader);
    if (!this.searchConsoleService.isConfigured()) {
      throw new InternalServerErrorException('Google Search Console is not configured');
    }

    const end = endDate || new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 31 * 86400000).toISOString().split('T')[0];

    return this.searchConsoleService.getTopQueries(start, end, Number(limit));
  }

  @Get('search-console/pages')
  async getSearchConsolePages(
    @Headers('authorization') authHeader: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit = 50,
  ) {
    await this.requireAdmin(authHeader);
    if (!this.searchConsoleService.isConfigured()) {
      throw new InternalServerErrorException('Google Search Console is not configured');
    }

    const end = endDate || new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 31 * 86400000).toISOString().split('T')[0];

    return this.searchConsoleService.getTopPages(start, end, Number(limit));
  }

  @Get('search-console/sitemaps')
  async getSitemapStatus(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    if (!this.searchConsoleService.isConfigured()) {
      throw new InternalServerErrorException('Google Search Console is not configured');
    }
    return this.searchConsoleService.getSitemapStatus();
  }

  @Post('search-console/submit-sitemap')
  @HttpCode(HttpStatus.OK)
  async submitSitemap(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    if (!this.searchConsoleService.isConfigured()) {
      throw new InternalServerErrorException('Google Search Console is not configured');
    }
    const success = await this.searchConsoleService.submitSitemap();
    return { success };
  }
}
