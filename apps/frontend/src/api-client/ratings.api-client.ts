import axios from '@/lib/axios';
import { RatingEntityType } from '@/shared/enums';

// ==========================================
// Types
// ==========================================

export interface CreateRatingDto {
  event_id: string;
  rated_entity_type: RatingEntityType;
  rated_entity_id: string;
  rating: number;
  comment?: string;
  is_anonymous?: boolean;
}

export interface RatingResponse {
  id: string;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface RatingWithEvent {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  event: {
    id: string;
    name: string;
    eventDate: string;
  };
  rater: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface MyRating {
  id: string;
  ratedEntityType: RatingEntityType;
  ratedEntityId: string;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  createdAt: string;
  event: {
    id: string;
    name: string;
    eventDate: string;
  };
}

export interface RatingSummary {
  entityId: string;
  entityType: RatingEntityType;
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<string, number>;
}

export interface RateableEntity {
  id: string;
  name: string;
  alreadyRated: boolean;
}

export interface JudgeRateable extends RateableEntity {
  level: string;
}

export interface EventRateableEntities {
  judges: JudgeRateable[];
  eventDirectors: RateableEntity[];
}

// ==========================================
// API Client
// ==========================================

export const ratingsApi = {
  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  /**
   * Get ratings for a judge
   */
  getJudgeRatings: async (
    judgeId: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<{ ratings: RatingWithEvent[]; total: number }> => {
    const response = await axios.get(`/api/ratings/judges/${judgeId}`, { params });
    return response.data;
  },

  /**
   * Get ratings for an event director
   */
  getEventDirectorRatings: async (
    edId: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<{ ratings: RatingWithEvent[]; total: number }> => {
    const response = await axios.get(`/api/ratings/event-directors/${edId}`, { params });
    return response.data;
  },

  /**
   * Get rating summary for a judge
   */
  getJudgeRatingSummary: async (judgeId: string): Promise<RatingSummary> => {
    const response = await axios.get(`/api/ratings/judges/${judgeId}/summary`);
    return response.data;
  },

  /**
   * Get rating summary for an event director
   */
  getEventDirectorRatingSummary: async (edId: string): Promise<RatingSummary> => {
    const response = await axios.get(`/api/ratings/event-directors/${edId}/summary`);
    return response.data;
  },

  // ==========================================
  // AUTHENTICATED ENDPOINTS
  // ==========================================

  /**
   * Check if user competed at an event (has results under their MECA ID)
   */
  hasUserCompetedAtEvent: async (eventId: string): Promise<boolean> => {
    const response = await axios.get(`/api/ratings/events/${eventId}/competed`);
    return response.data.competed;
  },

  /**
   * Get rateable entities for an event (judges and EDs the user can rate)
   */
  getEventRateableEntities: async (eventId: string): Promise<EventRateableEntities> => {
    const response = await axios.get(`/api/ratings/events/${eventId}/rateable`);
    return response.data;
  },

  /**
   * Submit a rating
   */
  createRating: async (data: CreateRatingDto): Promise<RatingResponse> => {
    const response = await axios.post('/api/ratings', data);
    return response.data;
  },

  /**
   * Get current user's submitted ratings
   */
  getMyRatings: async (
    params: { limit?: number; offset?: number } = {},
  ): Promise<{ ratings: MyRating[]; total: number }> => {
    const response = await axios.get('/api/ratings/me', { params });
    return response.data;
  },

  /**
   * Delete own rating (within 24 hours)
   */
  deleteRating: async (ratingId: string): Promise<{ success: boolean }> => {
    const response = await axios.delete(`/api/ratings/${ratingId}`);
    return response.data;
  },

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  /**
   * Get all ratings for an event (admin only)
   */
  getEventRatings: async (eventId: string): Promise<
    Array<{
      id: string;
      ratedEntityType: RatingEntityType;
      ratedEntityId: string;
      rating: number;
      comment?: string;
      isAnonymous: boolean;
      createdAt: string;
      ratedBy: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    }>
  > => {
    const response = await axios.get(`/api/ratings/events/${eventId}`);
    return response.data;
  },

  /**
   * Admin delete any rating
   */
  adminDeleteRating: async (ratingId: string): Promise<{ success: boolean }> => {
    const response = await axios.delete(`/api/ratings/admin/${ratingId}`);
    return response.data;
  },

  /**
   * Get admin analytics (admin only)
   */
  getAdminAnalytics: async (): Promise<{
    totalRatings: number;
    judgeRatings: number;
    edRatings: number;
    averageJudgeRating: number;
    averageEdRating: number;
    ratingsThisMonth: number;
    ratingsByMonth: { month: string; count: number }[];
  }> => {
    const response = await axios.get('/api/ratings/admin/analytics');
    return response.data;
  },

  /**
   * Get all ratings with filters (admin only)
   */
  getAllRatings: async (params: {
    entityType?: RatingEntityType;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    ratings: Array<{
      id: string;
      ratedEntityType: RatingEntityType;
      ratedEntityId: string;
      rating: number;
      comment?: string;
      isAnonymous: boolean;
      createdAt: string;
      event: { id: string; name: string; eventDate: string };
      ratedBy: { id: string; firstName: string; lastName: string; email: string };
    }>;
    total: number;
  }> => {
    const response = await axios.get('/api/ratings/admin/all', { params });
    return response.data;
  },

  /**
   * Get top rated entities (admin only)
   */
  getTopRated: async (
    entityType: RatingEntityType,
    limit: number = 10,
  ): Promise<Array<{
    entityId: string;
    entityName: string;
    averageRating: number;
    totalRatings: number;
  }>> => {
    const response = await axios.get(`/api/ratings/admin/top-rated/${entityType}`, {
      params: { limit },
    });
    return response.data;
  },
};
