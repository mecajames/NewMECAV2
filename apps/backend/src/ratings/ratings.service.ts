import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/postgresql';
import { Rating } from './rating.entity';
import { Judge } from '../judges/judge.entity';
import { EventDirector } from '../event-directors/event-director.entity';
import { EventJudgeAssignment } from '../judges/event-judge-assignment.entity';
import { EventDirectorAssignment } from '../event-directors/event-director-assignment.entity';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Membership } from '../memberships/memberships.entity';
import { RatingEntityType, EventAssignmentStatus, CreateRatingDto, PaymentStatus } from '@newmeca/shared';

@Injectable()
export class RatingsService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Create a rating for a judge or event director
   * Validates that:
   * 1. The event exists and is completed
   * 2. The rater participated in the event
   * 3. The rated entity was assigned to the event
   * 4. No duplicate rating exists
   */
  async createRating(userId: string, dto: CreateRatingDto): Promise<Rating> {
    const em = this.em.fork();

    // Get the user profile
    const profile = await em.findOne(Profile, { id: userId });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Get the event
    const event = await em.findOne(Event, { id: dto.event_id });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Verify event is completed (users should only rate after event)
    if (event.status !== 'completed') {
      throw new BadRequestException('Ratings can only be submitted for completed events');
    }

    // Check for duplicate rating
    const existingRating = await em.findOne(Rating, {
      event: { id: dto.event_id },
      ratedEntityType: dto.rated_entity_type,
      ratedEntityId: dto.rated_entity_id,
      ratedBy: { id: userId },
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this person for this event');
    }

    // Verify the rated entity was assigned to this event
    await this.verifyEntityAssignment(em, dto.event_id, dto.rated_entity_type, dto.rated_entity_id);

    // Create the rating
    const rating = em.create(Rating, {
      event,
      ratedEntityType: dto.rated_entity_type,
      ratedEntityId: dto.rated_entity_id,
      ratedBy: profile,
      rating: dto.rating,
      comment: dto.comment,
      isAnonymous: dto.is_anonymous ?? true,
      createdAt: new Date(),
    });

    await em.persistAndFlush(rating);

    // Update the average rating for the entity
    await this.updateEntityAverageRating(em, dto.rated_entity_type, dto.rated_entity_id);

    return rating;
  }

  /**
   * Verify that the rated entity was assigned to the event
   */
  private async verifyEntityAssignment(
    em: EntityManager,
    eventId: string,
    entityType: RatingEntityType,
    entityId: string,
  ): Promise<void> {
    if (entityType === RatingEntityType.JUDGE) {
      const assignment = await em.findOne(EventJudgeAssignment, {
        event: { id: eventId },
        judge: { id: entityId },
        status: { $in: [EventAssignmentStatus.ACCEPTED, EventAssignmentStatus.CONFIRMED, EventAssignmentStatus.COMPLETED] },
      });

      if (!assignment) {
        throw new BadRequestException('This judge was not assigned to this event');
      }
    } else if (entityType === RatingEntityType.EVENT_DIRECTOR) {
      const assignment = await em.findOne(EventDirectorAssignment, {
        event: { id: eventId },
        eventDirector: { id: entityId },
        status: { $in: [EventAssignmentStatus.ACCEPTED, EventAssignmentStatus.CONFIRMED, EventAssignmentStatus.COMPLETED] },
      });

      if (!assignment) {
        throw new BadRequestException('This event director was not assigned to this event');
      }
    }
  }

  /**
   * Update the average rating for a judge or event director
   */
  private async updateEntityAverageRating(
    em: EntityManager,
    entityType: RatingEntityType,
    entityId: string,
  ): Promise<void> {
    const ratings = await em.find(Rating, {
      ratedEntityType: entityType,
      ratedEntityId: entityId,
    });

    if (ratings.length === 0) return;

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / ratings.length;

    if (entityType === RatingEntityType.JUDGE) {
      const judge = await em.findOne(Judge, { id: entityId });
      if (judge) {
        judge.averageRating = average;
        judge.totalRatings = ratings.length;
        await em.persistAndFlush(judge);
      }
    } else if (entityType === RatingEntityType.EVENT_DIRECTOR) {
      const ed = await em.findOne(EventDirector, { id: entityId });
      if (ed) {
        ed.averageRating = average;
        ed.totalRatings = ratings.length;
        await em.persistAndFlush(ed);
      }
    }
  }

  /**
   * Get ratings for a specific entity (judge or event director)
   */
  async getRatingsForEntity(
    entityType: RatingEntityType,
    entityId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ ratings: Rating[]; total: number }> {
    const em = this.em.fork();

    const [ratings, total] = await em.findAndCount(
      Rating,
      {
        ratedEntityType: entityType,
        ratedEntityId: entityId,
      },
      {
        populate: ['event', 'ratedBy'],
        orderBy: { createdAt: 'DESC' },
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      },
    );

    return { ratings, total };
  }

  /**
   * Get rating summary for an entity
   */
  async getRatingSummary(
    entityType: RatingEntityType,
    entityId: string,
  ): Promise<{
    entityId: string;
    entityType: RatingEntityType;
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Record<string, number>;
  }> {
    const em = this.em.fork();

    const ratings = await em.find(Rating, {
      ratedEntityType: entityType,
      ratedEntityId: entityId,
    });

    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sum = 0;

    for (const rating of ratings) {
      sum += rating.rating;
      distribution[rating.rating.toString() as keyof typeof distribution]++;
    }

    return {
      entityId,
      entityType,
      averageRating: ratings.length > 0 ? sum / ratings.length : 0,
      totalRatings: ratings.length,
      ratingDistribution: distribution,
    };
  }

  /**
   * Get ratings submitted by a user
   */
  async getMyRatings(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ ratings: Rating[]; total: number }> {
    const em = this.em.fork();

    const [ratings, total] = await em.findAndCount(
      Rating,
      {
        ratedBy: { id: userId },
      },
      {
        populate: ['event'],
        orderBy: { createdAt: 'DESC' },
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      },
    );

    return { ratings, total };
  }

  /**
   * Check if user has competed at an event (has results under their MECA ID)
   */
  async hasUserCompetedAtEvent(eventId: string, userId: string): Promise<boolean> {
    const em = this.em.fork();

    // Get the user's MECA IDs from their memberships
    const memberships = await em.find(Membership, {
      user: userId,
      mecaId: { $ne: null },
      paymentStatus: PaymentStatus.PAID,
    });

    if (memberships.length === 0) {
      return false;
    }

    // Get MECA IDs as strings (competition results store mecaId as string)
    const userMecaIds = memberships.map(m => m.mecaId!.toString());

    // Check if any competition results exist for this event with the user's MECA IDs
    const resultCount = await em.count(CompetitionResult, {
      event: { id: eventId },
      mecaId: { $in: userMecaIds },
    });

    return resultCount > 0;
  }

  /**
   * Check if user can rate for an event (must have competed at the event with results entered)
   */
  async getEventRateableEntities(
    eventId: string,
    userId: string,
  ): Promise<{
    judges: { id: string; name: string; level: string; alreadyRated: boolean }[];
    eventDirectors: { id: string; name: string; alreadyRated: boolean }[];
  }> {
    const em = this.em.fork();

    // Get the event
    const event = await em.findOne(Event, { id: eventId });
    if (!event || event.status !== 'completed') {
      return { judges: [], eventDirectors: [] };
    }

    // Check if user has competed at this event (has results under their MECA ID)
    const hasCompeted = await this.hasUserCompetedAtEvent(eventId, userId);
    if (!hasCompeted) {
      return { judges: [], eventDirectors: [] };
    }

    // Get accepted/confirmed/completed judge assignments for this event
    const judgeAssignments = await em.find(
      EventJudgeAssignment,
      {
        event: { id: eventId },
        status: { $in: [EventAssignmentStatus.ACCEPTED, EventAssignmentStatus.CONFIRMED, EventAssignmentStatus.COMPLETED] },
      },
      { populate: ['judge', 'judge.user'] },
    );

    // Get accepted/confirmed/completed ED assignments for this event
    const edAssignments = await em.find(
      EventDirectorAssignment,
      {
        event: { id: eventId },
        status: { $in: [EventAssignmentStatus.ACCEPTED, EventAssignmentStatus.CONFIRMED, EventAssignmentStatus.COMPLETED] },
      },
      { populate: ['eventDirector', 'eventDirector.user'] },
    );

    // Get existing ratings by this user for this event
    const existingRatings = await em.find(Rating, {
      event: { id: eventId },
      ratedBy: { id: userId },
    });

    const ratedJudgeIds = existingRatings
      .filter(r => r.ratedEntityType === RatingEntityType.JUDGE)
      .map(r => r.ratedEntityId);

    const ratedEDIds = existingRatings
      .filter(r => r.ratedEntityType === RatingEntityType.EVENT_DIRECTOR)
      .map(r => r.ratedEntityId);

    return {
      judges: judgeAssignments.map(a => ({
        id: a.judge.id,
        name: `${a.judge.user?.first_name || ''} ${a.judge.user?.last_name || ''}`.trim(),
        level: a.judge.level,
        alreadyRated: ratedJudgeIds.includes(a.judge.id),
      })),
      eventDirectors: edAssignments.map(a => ({
        id: a.eventDirector.id,
        name: `${a.eventDirector.user?.first_name || ''} ${a.eventDirector.user?.last_name || ''}`.trim(),
        alreadyRated: ratedEDIds.includes(a.eventDirector.id),
      })),
    };
  }

  /**
   * Delete a rating (admin only or owner within 24 hours)
   */
  async deleteRating(ratingId: string, userId: string, isAdmin: boolean): Promise<void> {
    const em = this.em.fork();

    const rating = await em.findOne(Rating, { id: ratingId }, { populate: ['ratedBy'] });
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Check permissions
    if (!isAdmin && rating.ratedBy.id !== userId) {
      throw new ForbiddenException('You can only delete your own ratings');
    }

    // Non-admins can only delete within 24 hours
    if (!isAdmin) {
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - rating.createdAt.getTime() > dayInMs) {
        throw new ForbiddenException('Ratings can only be deleted within 24 hours');
      }
    }

    const entityType = rating.ratedEntityType;
    const entityId = rating.ratedEntityId;

    await em.removeAndFlush(rating);

    // Update the average rating for the entity
    await this.updateEntityAverageRating(em, entityType, entityId);
  }

  /**
   * Get all ratings for an event (admin)
   */
  async getEventRatings(eventId: string): Promise<Rating[]> {
    const em = this.em.fork();

    return em.find(
      Rating,
      { event: { id: eventId } },
      { populate: ['ratedBy'], orderBy: { createdAt: 'DESC' } },
    );
  }

  /**
   * Get admin analytics for ratings
   */
  async getAdminAnalytics(): Promise<{
    totalRatings: number;
    judgeRatings: number;
    edRatings: number;
    averageJudgeRating: number;
    averageEdRating: number;
    ratingsThisMonth: number;
    ratingsByMonth: { month: string; count: number }[];
  }> {
    const em = this.em.fork();

    // Get all ratings
    const allRatings = await em.find(Rating, {});

    const judgeRatings = allRatings.filter(r => r.ratedEntityType === RatingEntityType.JUDGE);
    const edRatings = allRatings.filter(r => r.ratedEntityType === RatingEntityType.EVENT_DIRECTOR);

    // Calculate averages
    const avgJudge = judgeRatings.length > 0
      ? judgeRatings.reduce((sum, r) => sum + r.rating, 0) / judgeRatings.length
      : 0;
    const avgEd = edRatings.length > 0
      ? edRatings.reduce((sum, r) => sum + r.rating, 0) / edRatings.length
      : 0;

    // This month's ratings
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ratingsThisMonth = allRatings.filter(r => r.createdAt >= startOfMonth).length;

    // Ratings by month (last 12 months)
    const monthlyData: { [key: string]: number } = {};
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = 0;
    }

    allRatings.forEach(r => {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key] !== undefined) {
        monthlyData[key]++;
      }
    });

    return {
      totalRatings: allRatings.length,
      judgeRatings: judgeRatings.length,
      edRatings: edRatings.length,
      averageJudgeRating: avgJudge,
      averageEdRating: avgEd,
      ratingsThisMonth,
      ratingsByMonth: Object.entries(monthlyData).map(([month, count]) => ({ month, count })),
    };
  }

  /**
   * Get all ratings with filters (admin)
   */
  async getAllRatings(filters?: {
    entityType?: RatingEntityType;
    limit?: number;
    offset?: number;
  }): Promise<{ ratings: Rating[]; total: number }> {
    const em = this.em.fork();

    const where: any = {};
    if (filters?.entityType) {
      where.ratedEntityType = filters.entityType;
    }

    const [ratings, total] = await em.findAndCount(
      Rating,
      where,
      {
        populate: ['event', 'ratedBy'],
        orderBy: { createdAt: 'DESC' },
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      },
    );

    return { ratings, total };
  }

  /**
   * Get top rated entities (admin)
   */
  async getTopRated(entityType: RatingEntityType, limit: number = 10): Promise<{
    entityId: string;
    entityName: string;
    averageRating: number;
    totalRatings: number;
  }[]> {
    const em = this.em.fork();

    if (entityType === RatingEntityType.JUDGE) {
      const judges = await em.find(
        Judge,
        { totalRatings: { $gt: 0 } },
        {
          populate: ['user'],
          orderBy: { averageRating: 'DESC' },
          limit,
        },
      );

      return judges.map(j => ({
        entityId: j.id,
        entityName: `${j.user?.first_name || ''} ${j.user?.last_name || ''}`.trim(),
        averageRating: j.averageRating || 0,
        totalRatings: j.totalRatings || 0,
      }));
    } else {
      const eds = await em.find(
        EventDirector,
        { totalRatings: { $gt: 0 } },
        {
          populate: ['user'],
          orderBy: { averageRating: 'DESC' },
          limit,
        },
      );

      return eds.map(ed => ({
        entityId: ed.id,
        entityName: `${ed.user?.first_name || ''} ${ed.user?.last_name || ''}`.trim(),
        averageRating: ed.averageRating || 0,
        totalRatings: ed.totalRatings || 0,
      }));
    }
  }
}
