import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { RatingsService } from './ratings.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { CreateRatingSchema, CreateRatingDto, RatingEntityType, UserRole } from '@newmeca/shared';

@Controller('api/ratings')
export class RatingsController {
  constructor(
    private readonly ratingsService: RatingsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to get current user from auth header
  private async getCurrentUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    return user;
  }

  private async requireAdmin(authHeader?: string) {
    const user = await this.getCurrentUser(authHeader);
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
   * Get ratings for a judge
   */
  @Get('judges/:judgeId')
  async getJudgeRatings(
    @Param('judgeId') judgeId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.ratingsService.getRatingsForEntity(
      RatingEntityType.JUDGE,
      judgeId,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );

    // Filter out rater info for anonymous ratings
    const ratings = result.ratings.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      event: {
        id: r.event.id,
        name: r.event.title,
        eventDate: r.event.eventDate,
      },
      rater: r.isAnonymous ? null : {
        id: r.ratedBy.id,
        firstName: r.ratedBy.first_name,
        lastName: r.ratedBy.last_name,
      },
    }));

    return { ratings, total: result.total };
  }

  /**
   * Get ratings for an event director
   */
  @Get('event-directors/:edId')
  async getEventDirectorRatings(
    @Param('edId') edId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.ratingsService.getRatingsForEntity(
      RatingEntityType.EVENT_DIRECTOR,
      edId,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      },
    );

    // Filter out rater info for anonymous ratings
    const ratings = result.ratings.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      event: {
        id: r.event.id,
        name: r.event.title,
        eventDate: r.event.eventDate,
      },
      rater: r.isAnonymous ? null : {
        id: r.ratedBy.id,
        firstName: r.ratedBy.first_name,
        lastName: r.ratedBy.last_name,
      },
    }));

    return { ratings, total: result.total };
  }

  /**
   * Get rating summary for a judge
   */
  @Get('judges/:judgeId/summary')
  async getJudgeRatingSummary(@Param('judgeId') judgeId: string) {
    return this.ratingsService.getRatingSummary(RatingEntityType.JUDGE, judgeId);
  }

  /**
   * Get rating summary for an event director
   */
  @Get('event-directors/:edId/summary')
  async getEventDirectorRatingSummary(@Param('edId') edId: string) {
    return this.ratingsService.getRatingSummary(RatingEntityType.EVENT_DIRECTOR, edId);
  }

  // =============================================================================
  // Authenticated Endpoints
  // =============================================================================

  /**
   * Check if user competed at an event (has results under their MECA ID)
   */
  @Get('events/:eventId/competed')
  async hasUserCompetedAtEvent(
    @Param('eventId') eventId: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const user = await this.getCurrentUser(authHeader);
    const competed = await this.ratingsService.hasUserCompetedAtEvent(eventId, user.id);
    return { competed };
  }

  /**
   * Get entities that can be rated for an event
   */
  @Get('events/:eventId/rateable')
  async getEventRateableEntities(
    @Param('eventId') eventId: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const user = await this.getCurrentUser(authHeader);
    return this.ratingsService.getEventRateableEntities(eventId, user.id);
  }

  /**
   * Submit a rating
   */
  @Post()
  async createRating(
    @Headers('authorization') authHeader: string,
    @Body(new ZodValidationPipe(CreateRatingSchema)) dto: CreateRatingDto,
  ) {
    const user = await this.getCurrentUser(authHeader);
    const rating = await this.ratingsService.createRating(user.id, dto);
    return {
      id: rating.id,
      rating: rating.rating,
      comment: rating.comment,
      isAnonymous: rating.isAnonymous,
      createdAt: rating.createdAt,
    };
  }

  /**
   * Get my submitted ratings
   */
  @Get('me')
  async getMyRatings(
    @Headers('authorization') authHeader: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = await this.getCurrentUser(authHeader);
    const result = await this.ratingsService.getMyRatings(user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const ratings = result.ratings.map(r => ({
      id: r.id,
      ratedEntityType: r.ratedEntityType,
      ratedEntityId: r.ratedEntityId,
      rating: r.rating,
      comment: r.comment,
      isAnonymous: r.isAnonymous,
      createdAt: r.createdAt,
      event: {
        id: r.event.id,
        name: r.event.title,
        eventDate: r.event.eventDate,
      },
    }));

    return { ratings, total: result.total };
  }

  /**
   * Delete a rating (own rating within 24 hours)
   */
  @Delete(':id')
  async deleteRating(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const user = await this.getCurrentUser(authHeader);
    await this.ratingsService.deleteRating(id, user.id, false);
    return { success: true };
  }

  // =============================================================================
  // Admin Endpoints
  // =============================================================================

  /**
   * Get all ratings for an event (admin)
   */
  @Get('events/:eventId')
  async getEventRatings(
    @Param('eventId') eventId: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    const ratings = await this.ratingsService.getEventRatings(eventId);

    return ratings.map(r => ({
      id: r.id,
      ratedEntityType: r.ratedEntityType,
      ratedEntityId: r.ratedEntityId,
      rating: r.rating,
      comment: r.comment,
      isAnonymous: r.isAnonymous,
      createdAt: r.createdAt,
      ratedBy: {
        id: r.ratedBy.id,
        firstName: r.ratedBy.first_name,
        lastName: r.ratedBy.last_name,
        email: r.ratedBy.email,
      },
    }));
  }

  /**
   * Admin delete any rating
   */
  @Delete('admin/:id')
  async adminDeleteRating(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    await this.ratingsService.deleteRating(id, user.id, true);
    return { success: true };
  }

  /**
   * Get admin analytics
   */
  @Get('admin/analytics')
  async getAdminAnalytics(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.ratingsService.getAdminAnalytics();
  }

  /**
   * Get all ratings (admin)
   */
  @Get('admin/all')
  async getAllRatings(
    @Headers('authorization') authHeader: string,
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    await this.requireAdmin(authHeader);
    const result = await this.ratingsService.getAllRatings({
      entityType: entityType as RatingEntityType || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return {
      ratings: result.ratings.map(r => ({
        id: r.id,
        ratedEntityType: r.ratedEntityType,
        ratedEntityId: r.ratedEntityId,
        rating: r.rating,
        comment: r.comment,
        isAnonymous: r.isAnonymous,
        createdAt: r.createdAt,
        event: {
          id: r.event.id,
          name: r.event.title,
          eventDate: r.event.eventDate,
        },
        ratedBy: {
          id: r.ratedBy.id,
          firstName: r.ratedBy.first_name,
          lastName: r.ratedBy.last_name,
          email: r.ratedBy.email,
        },
      })),
      total: result.total,
    };
  }

  /**
   * Get top rated entities (admin)
   */
  @Get('admin/top-rated/:entityType')
  async getTopRated(
    @Headers('authorization') authHeader: string,
    @Param('entityType') entityType: string,
    @Query('limit') limit?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.ratingsService.getTopRated(
      entityType as RatingEntityType,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
