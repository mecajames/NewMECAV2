import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Inject,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ModerationService } from './moderation.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

@Controller('api/moderation')
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
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

  @Get('images/:userId')
  async getHiddenImages(
    @Param('userId') userId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<string[]> {
    await this.requireAdmin(authHeader);
    return this.moderationService.getHiddenImages(userId);
  }

  @Post('images/toggle')
  async toggleImageVisibility(
    @Headers('authorization') authHeader: string,
    @Body() body: {
      userId: string;
      imageUrl: string;
      imageType: string;
      hide: boolean;
      link?: string;
    },
  ): Promise<{ isHidden: boolean }> {
    const { user } = await this.requireAdmin(authHeader);
    return this.moderationService.toggleImageVisibility({
      userId: body.userId,
      imageUrl: body.imageUrl,
      imageType: body.imageType,
      hide: body.hide,
      moderatorId: user.id,
    });
  }

  @Post('images/delete-notify')
  async deleteImageNotify(
    @Headers('authorization') authHeader: string,
    @Body() body: {
      userId: string;
      imageUrl: string;
      imageType: string;
      title: string;
      message: string;
      link?: string;
      reason?: string;
      customMessage?: string;
    },
  ): Promise<{ success: boolean }> {
    const { user } = await this.requireAdmin(authHeader);

    // Send notification
    await this.moderationService.sendModerationNotification({
      userId: body.userId,
      moderatorId: user.id,
      title: body.title,
      message: body.message,
      link: body.link,
    });

    // Log the action
    await this.moderationService.logModerationAction({
      userId: body.userId,
      moderatorId: user.id,
      action: 'image_deleted',
      reason: body.reason,
      details: {
        image_url: body.imageUrl,
        image_type: body.imageType,
        custom_message: body.customMessage,
      },
    });

    return { success: true };
  }
}
