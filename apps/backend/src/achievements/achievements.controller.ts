import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AchievementsService } from './achievements.service';
import { AchievementImageService } from './image-generator/achievement-image.service';
import { AchievementRecipient } from './achievement-recipient.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import {
  CreateAchievementDefinitionDto,
  UpdateAchievementDefinitionDto,
  GetAchievementDefinitionsQuery,
  GetAchievementRecipientsQuery,
  UserRole,
} from '@newmeca/shared';

@Controller('api/achievements')
export class AchievementsController {
  constructor(
    private readonly achievementsService: AchievementsService,
    private readonly imageService: AchievementImageService,
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

  // =============================================================================
  // Public Endpoints
  // =============================================================================

  /**
   * Get achievements for a specific profile (public)
   */
  @Get('profile/:profileId')
  async getAchievementsForProfile(@Param('profileId', ParseUUIDPipe) profileId: string) {
    const achievements = await this.achievementsService.getAchievementsForProfile(profileId);
    return {
      achievements,
      total_count: achievements.length,
    };
  }

  /**
   * Get achievements for a specific MECA ID (public)
   */
  @Get('meca-id/:mecaId')
  async getAchievementsForMecaId(@Param('mecaId') mecaId: string) {
    const achievements = await this.achievementsService.getAchievementsForMecaId(mecaId);
    return {
      achievements,
      total_count: achievements.length,
    };
  }

  /**
   * Get all available achievement templates (public)
   */
  @Get('templates')
  async getTemplates() {
    return this.achievementsService.getAllTemplates();
  }

  /**
   * Get a specific template by key (public)
   */
  @Get('templates/:key')
  async getTemplateByKey(@Param('key') key: string) {
    return this.achievementsService.getTemplateByKey(key);
  }

  // =============================================================================
  // Admin Endpoints - Definitions
  // =============================================================================

  /**
   * Get all achievement definitions (admin)
   */
  @Get('admin/definitions')
  async getAllDefinitions(
    @Headers('authorization') authHeader: string,
    @Query() query: GetAchievementDefinitionsQuery
  ) {
    await this.requireAdmin(authHeader);
    return this.achievementsService.getAllDefinitions(query);
  }

  /**
   * Get a specific achievement definition (admin)
   */
  @Get('admin/definitions/:id')
  async getDefinitionById(
    @Headers('authorization') authHeader: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.requireAdmin(authHeader);
    return this.achievementsService.getDefinitionById(id);
  }

  /**
   * Create a new achievement definition (admin)
   */
  @Post('admin/definitions')
  async createDefinition(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateAchievementDefinitionDto
  ) {
    await this.requireAdmin(authHeader);
    return this.achievementsService.createDefinition(dto);
  }

  /**
   * Update an achievement definition (admin)
   */
  @Put('admin/definitions/:id')
  async updateDefinition(
    @Headers('authorization') authHeader: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAchievementDefinitionDto
  ) {
    await this.requireAdmin(authHeader);
    return this.achievementsService.updateDefinition(id, dto);
  }

  /**
   * Delete an achievement definition (admin)
   */
  @Delete('admin/definitions/:id')
  async deleteDefinition(
    @Headers('authorization') authHeader: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.requireAdmin(authHeader);
    return this.achievementsService.deleteDefinition(id);
  }

  // =============================================================================
  // Admin Endpoints - Recipients
  // =============================================================================

  /**
   * Get all achievement recipients with filters (admin)
   */
  @Get('admin/recipients')
  async getRecipients(
    @Headers('authorization') authHeader: string,
    @Query() query: GetAchievementRecipientsQuery
  ) {
    await this.requireAdmin(authHeader);
    return this.achievementsService.getRecipients(query);
  }

  /**
   * Trigger backfill of achievements for existing results (admin)
   */
  @Post('admin/backfill')
  async triggerBackfill(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.achievementsService.backfillAchievements();
  }

  /**
   * Manually check and award achievements for a specific result (admin)
   */
  @Post('admin/check-result/:resultId')
  async checkResultForAchievements(
    @Headers('authorization') authHeader: string,
    @Param('resultId', ParseUUIDPipe) resultId: string
  ) {
    await this.requireAdmin(authHeader);
    const awarded = await this.achievementsService.checkAndAwardAchievements(resultId);
    return {
      awarded_count: awarded.length,
      achievements: awarded.map((r) => ({
        id: r.id,
        achievement_name: r.achievement?.name,
        achieved_value: Number(r.achievedValue),
      })),
    };
  }

  /**
   * Generate images for all recipients that don't have one yet (admin)
   */
  @Post('admin/generate-images')
  async generateMissingImages(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.imageService.generateMissingImages();
  }

  /**
   * Retry image generation for a specific recipient (admin)
   * Returns detailed error information for debugging
   */
  @Post('admin/recipients/:id/regenerate-image')
  async regenerateImageForRecipient(
    @Headers('authorization') authHeader: string,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.requireAdmin(authHeader);

    // Get recipient with achievement details for debugging (before generation)
    const em = this.em.fork();
    const recipientBefore = await em.findOne(
      AchievementRecipient,
      { id },
      { populate: ['achievement'] }
    );

    if (!recipientBefore) {
      return {
        success: false,
        error: `Recipient not found: ${id}`,
      };
    }

    const debugInfo = {
      recipientId: id,
      achievementId: recipientBefore.achievement?.id,
      achievementName: recipientBefore.achievement?.name,
      templateKey: recipientBefore.achievement?.templateKey,
      renderValue: recipientBefore.achievement?.renderValue,
      achievedValue: recipientBefore.achievedValue,
      existingImageUrl: recipientBefore.imageUrl,
    };

    // Generate the image
    await this.imageService.generateImageForRecipient(id);

    // Re-fetch recipient from database to get the updated image URL
    // Use a fresh forked EM to ensure we get the latest data
    const freshEm = this.em.fork();
    const recipientAfter = await freshEm.findOne(AchievementRecipient, { id });
    const newImageUrl = recipientAfter?.imageUrl;

    // Success is determined by whether we have a new image URL
    const success = !!newImageUrl && newImageUrl !== debugInfo.existingImageUrl;

    return {
      success,
      debug: debugInfo,
      newImageUrl,
    };
  }

  /**
   * Check if image generation assets are properly configured (admin)
   */
  @Get('admin/check-assets')
  async checkAssets(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.imageService.checkAssets();
  }
}
