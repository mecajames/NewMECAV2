import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  MemberGalleryService,
  CreateGalleryImageDto,
  UpdateGalleryImageDto,
} from './member-gallery.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

@Controller('api/member-gallery')
export class MemberGalleryController {
  constructor(
    private readonly memberGalleryService: MemberGalleryService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require any authenticated user
  private async requireAuth(authHeader?: string) {
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
    return { user, profile };
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    const { user, profile } = await this.requireAuth(authHeader);

    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return { user, profile };
  }

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Get public gallery for a member
   */
  @Get(':memberId')
  async getPublicGallery(@Param('memberId') memberId: string) {
    return this.memberGalleryService.getPublicGalleryByMemberId(memberId);
  }

  // ============================================
  // AUTHENTICATED USER ENDPOINTS (Own Gallery)
  // ============================================

  /**
   * Get current user's gallery (including private images)
   */
  @Get('me')
  async getMyGallery(@Headers('authorization') authHeader: string) {
    const { user } = await this.requireAuth(authHeader);
    return this.memberGalleryService.getGalleryByMemberId(user.id, true);
  }

  /**
   * Add an image to current user's gallery
   */
  @Post('me')
  @HttpCode(HttpStatus.CREATED)
  async addImage(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateGalleryImageDto,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.memberGalleryService.addImage(user.id, data);
  }

  /**
   * Update an image in current user's gallery
   */
  @Put('me/:imageId')
  async updateImage(
    @Headers('authorization') authHeader: string,
    @Param('imageId') imageId: string,
    @Body() data: UpdateGalleryImageDto,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.memberGalleryService.updateImage(imageId, user.id, data);
  }

  /**
   * Delete an image from current user's gallery
   */
  @Delete('me/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(
    @Headers('authorization') authHeader: string,
    @Param('imageId') imageId: string,
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.memberGalleryService.deleteImage(imageId, user.id);
  }

  /**
   * Reorder images in current user's gallery
   */
  @Put('me/reorder')
  async reorderImages(
    @Headers('authorization') authHeader: string,
    @Body('imageIds') imageIds: string[],
  ) {
    const { user } = await this.requireAuth(authHeader);
    return this.memberGalleryService.reorderImages(user.id, imageIds);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all images for a member (including private) - admin only
   */
  @Get(':memberId/all')
  async getAllGalleryImages(
    @Headers('authorization') authHeader: string,
    @Param('memberId') memberId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.memberGalleryService.getGalleryByMemberId(memberId, true);
  }

  /**
   * Delete any image - admin only
   */
  @Delete(':memberId/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminDeleteImage(
    @Headers('authorization') authHeader: string,
    @Param('imageId') imageId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.memberGalleryService.adminDeleteImage(imageId);
  }
}
