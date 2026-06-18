import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AnnouncementsService } from './announcements.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { Public } from '../auth/public.decorator';
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
  PublicAnnouncement,
} from '@newmeca/shared';

@Controller('api/announcements')
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string): Promise<Profile> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const {
      data: { user },
      error,
    } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return profile as Profile;
  }

  /**
   * Optional auth: resolves the viewer's profile when a valid token is present,
   * otherwise null (anonymous). This endpoint is @Public() so logged-out visitors
   * can fetch banners too, so we parse the token manually instead of relying on
   * the global auth guard to populate request.user.
   */
  private async resolveViewer(authHeader?: string): Promise<Profile | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
      const token = authHeader.substring(7);
      const {
        data: { user },
        error,
      } = await this.supabaseAdmin.getClient().auth.getUser(token);
      if (error || !user) return null;
      const em = this.em.fork();
      return await em.findOne(Profile, { id: user.id });
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC — active banners for the current viewer (anonymous OR logged-in)
  // ---------------------------------------------------------------------------
  @Public()
  @Get('active')
  async getActive(
    @Headers('authorization') authHeader?: string,
  ): Promise<PublicAnnouncement[]> {
    const viewer = await this.resolveViewer(authHeader);
    return this.service.getActiveForViewer(viewer);
  }

  // ---------------------------------------------------------------------------
  // ADMIN CRUD  (note: 'admin/all' is declared before 'admin/:id')
  // ---------------------------------------------------------------------------
  @Get('admin/all')
  async adminFindAll(@Headers('authorization') authHeader?: string) {
    await this.requireAdmin(authHeader);
    return this.service.findAll();
  }

  @Get('admin/:id')
  async adminFindOne(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    const announcement = await this.service.findById(id);
    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  @Post('admin')
  @HttpCode(HttpStatus.CREATED)
  async adminCreate(
    @Headers('authorization') authHeader: string,
    @Body() body: unknown,
  ) {
    const admin = await this.requireAdmin(authHeader);
    const parsed = CreateAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      );
    }
    return this.service.create(parsed.data, admin.id);
  }

  @Put('admin/:id')
  async adminUpdate(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.requireAdmin(authHeader);
    const parsed = UpdateAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      );
    }
    return this.service.update(id, parsed.data);
  }

  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminDelete(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.service.remove(id);
  }
}
