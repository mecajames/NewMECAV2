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
import { MediaFilesService } from './media-files.service';
import { MediaFile } from './media-files.entity';
import { MediaType, UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';

@Controller('api/media-files')
export class MediaFilesController {
  constructor(
    private readonly mediaFilesService: MediaFilesService,
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
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  @Get()
  async getAllMediaFiles(@Query('fileType') fileType?: MediaType): Promise<MediaFile[]> {
    return this.mediaFilesService.findAll(fileType);
  }

  @Get('search')
  async searchMediaFiles(
    @Query('q') searchTerm: string,
    @Query('fileType') fileType?: MediaType,
  ): Promise<MediaFile[]> {
    return this.mediaFilesService.search(searchTerm, fileType);
  }

  @Get(':id')
  async getMediaFile(@Param('id') id: string): Promise<MediaFile> {
    return this.mediaFilesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMediaFile(
    @Headers('authorization') authHeader: string,
    @Body() data: Partial<MediaFile>,
  ): Promise<MediaFile> {
    await this.requireAdmin(authHeader);
    return this.mediaFilesService.create(data);
  }

  @Put(':id')
  async updateMediaFile(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: Partial<MediaFile>,
  ): Promise<MediaFile> {
    await this.requireAdmin(authHeader);
    return this.mediaFilesService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMediaFile(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.requireAdmin(authHeader);
    return this.mediaFilesService.delete(id);
  }
}
