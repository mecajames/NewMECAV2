import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Header,
  Req,
  Headers,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { SeoService, SeoSettings, SeoOverrideDto } from './seo.service';
import { PrerenderService } from './prerender.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

@Controller()
export class SeoController {
  constructor(
    private readonly seoService: SeoService,
    private readonly prerenderService: PrerenderService,
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

  // ===========================================================================
  // Public SEO endpoints
  // ===========================================================================

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  async getSitemap(): Promise<string> {
    return this.seoService.generateSitemap();
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  @Header('Cache-Control', 'public, max-age=86400')
  getRobotsTxt(): string {
    return this.seoService.generateRobotsTxt();
  }

  @Get('prerender/*')
  @Header('Content-Type', 'text/html')
  @Header('Cache-Control', 'public, max-age=3600')
  async prerender(@Req() req: Request): Promise<string> {
    const originalPath = req.path.replace(/^\/prerender/, '') || '/';
    return this.prerenderService.renderPage(originalPath);
  }

  // Public endpoint for frontend to fetch SEO override for current page
  @Get('api/seo/override')
  async getPublicOverride(@Query('path') path: string) {
    if (!path) return null;
    const override = await this.seoService.getOverrideByPath(path);
    if (!override) return null;
    return {
      title: override.title,
      description: override.description,
      canonical_url: override.canonical_url,
      noindex: override.noindex,
      og_image: override.og_image,
    };
  }

  // Public endpoint for frontend to get verification codes
  @Get('api/seo/verification')
  async getVerificationCodes() {
    const settings = await this.seoService.getSeoSettings();
    return {
      googleVerification: settings.googleVerification,
      bingVerification: settings.bingVerification,
    };
  }

  // ===========================================================================
  // Admin SEO Settings endpoints
  // ===========================================================================

  @Get('api/admin/seo/settings')
  async getSettings(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.seoService.getSeoSettings();
  }

  @Put('api/admin/seo/settings')
  async updateSettings(
    @Headers('authorization') authHeader: string,
    @Body() body: Partial<SeoSettings>,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    return this.seoService.updateSeoSettings(body, user.id);
  }

  // ===========================================================================
  // Admin SEO Overrides endpoints
  // ===========================================================================

  @Get('api/admin/seo/overrides')
  async listOverrides(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.seoService.getAllOverrides();
  }

  @Post('api/admin/seo/overrides')
  @HttpCode(HttpStatus.CREATED)
  async createOverride(
    @Headers('authorization') authHeader: string,
    @Body() body: SeoOverrideDto,
  ) {
    const { user } = await this.requireAdmin(authHeader);

    if (!body.url_path) {
      throw new BadRequestException('url_path is required');
    }

    // Normalize path to start with /
    if (!body.url_path.startsWith('/')) {
      body.url_path = '/' + body.url_path;
    }

    try {
      return await this.seoService.createOverride(body, user.id);
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  @Put('api/admin/seo/overrides/:id')
  async updateOverride(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: Partial<SeoOverrideDto>,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    return this.seoService.updateOverride(id, body, user.id);
  }

  @Delete('api/admin/seo/overrides/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOverride(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.seoService.deleteOverride(id);
  }
}
