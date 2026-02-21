import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { RatingsController } from '../ratings.controller';
import { RatingsService } from '../ratings.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('RatingsController', () => {
  let controller: RatingsController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_USER_ID = 'user_123';
  const TEST_ADMIN_ID = 'admin_456';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';

  function mockAuthSuccess(userId: string = TEST_USER_ID) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  }

  function mockAuthFailure() {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
  }

  function mockAdminAuth(userId: string = TEST_ADMIN_ID) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    (mockEm.findOne as jest.Mock).mockResolvedValue({ id: userId, role: UserRole.ADMIN });
  }

  function mockNonAdminAuth(userId: string = TEST_USER_ID) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    (mockEm.findOne as jest.Mock).mockResolvedValue({ id: userId, role: UserRole.USER });
  }

  beforeEach(async () => {
    mockGetUser = jest.fn();

    mockSupabaseAdmin = {
      getClient: jest.fn().mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      }),
    };

    mockEm = createMockEntityManager();

    mockService = {
      getRatingsForEntity: jest.fn().mockResolvedValue({ ratings: [], total: 0 }),
      getRatingSummary: jest.fn().mockResolvedValue({
        entityId: '',
        entityType: 'judge',
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      }),
      hasUserCompetedAtEvent: jest.fn().mockResolvedValue(false),
      getEventRateableEntities: jest.fn().mockResolvedValue({ judges: [], eventDirectors: [] }),
      createRating: jest.fn().mockResolvedValue({
        id: 'rating-1',
        rating: 5,
        comment: 'Great',
        isAnonymous: true,
        createdAt: new Date('2026-01-15'),
      }),
      getMyRatings: jest.fn().mockResolvedValue({ ratings: [], total: 0 }),
      deleteRating: jest.fn().mockResolvedValue(undefined),
      getEventRatings: jest.fn().mockResolvedValue([]),
      getAdminAnalytics: jest.fn().mockResolvedValue({
        totalRatings: 0,
        judgeRatings: 0,
        edRatings: 0,
        averageJudgeRating: 0,
        averageEdRating: 0,
        ratingsThisMonth: 0,
        ratingsByMonth: [],
      }),
      getAllRatings: jest.fn().mockResolvedValue({ ratings: [], total: 0 }),
      getTopRated: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingsController],
      providers: [
        { provide: RatingsService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<RatingsController>(RatingsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ====================================================================
  // AUTH HELPERS - tested through endpoints
  // ====================================================================

  describe('getCurrentUser behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.getMyRatings(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.getMyRatings('Basic some_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.getMyRatings('Bearer invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should extract token correctly and call getUser', async () => {
      mockAuthSuccess();
      mockService.getMyRatings.mockResolvedValue({ ratings: [], total: 0 });

      await controller.getMyRatings(VALID_AUTH_HEADER);

      expect(mockGetUser).toHaveBeenCalledWith('valid_token_abc');
    });
  });

  describe('requireAdmin behavior', () => {
    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(controller.getEventRatings('event-1', VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when profile is not found', async () => {
      mockAuthSuccess();
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.getEventRatings('event-1', VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ====================================================================
  // PUBLIC ENDPOINTS
  // ====================================================================

  describe('getJudgeRatings', () => {
    it('should return filtered ratings for a judge', async () => {
      const mockRatings = {
        ratings: [
          {
            id: 'r-1',
            rating: 5,
            comment: 'Great',
            createdAt: new Date('2026-01-15'),
            event: { id: 'e-1', title: 'Event 1', eventDate: new Date('2026-01-10') },
            isAnonymous: false,
            ratedBy: { id: 'u-1', first_name: 'John', last_name: 'Doe' },
          },
          {
            id: 'r-2',
            rating: 4,
            comment: 'Good',
            createdAt: new Date('2026-01-16'),
            event: { id: 'e-2', title: 'Event 2', eventDate: new Date('2026-01-12') },
            isAnonymous: true,
            ratedBy: { id: 'u-2', first_name: 'Jane', last_name: 'Smith' },
          },
        ],
        total: 2,
      };
      mockService.getRatingsForEntity.mockResolvedValue(mockRatings);

      const result = await controller.getJudgeRatings('judge-1');

      expect(mockService.getRatingsForEntity).toHaveBeenCalledWith('judge', 'judge-1', {
        limit: undefined,
        offset: undefined,
      });
      expect(result.total).toBe(2);
      // Non-anonymous rating should include rater info
      expect(result.ratings[0].rater).toEqual({ id: 'u-1', firstName: 'John', lastName: 'Doe' });
      // Anonymous rating should have null rater
      expect(result.ratings[1].rater).toBeNull();
    });

    it('should parse limit and offset query params', async () => {
      mockService.getRatingsForEntity.mockResolvedValue({ ratings: [], total: 0 });

      await controller.getJudgeRatings('judge-1', '10', '5');

      expect(mockService.getRatingsForEntity).toHaveBeenCalledWith('judge', 'judge-1', {
        limit: 10,
        offset: 5,
      });
    });
  });

  describe('getEventDirectorRatings', () => {
    it('should return filtered ratings for an event director', async () => {
      const mockRatings = {
        ratings: [
          {
            id: 'r-1',
            rating: 4,
            comment: 'Well organized',
            createdAt: new Date('2026-01-15'),
            event: { id: 'e-1', title: 'Event 1', eventDate: new Date('2026-01-10') },
            isAnonymous: true,
            ratedBy: { id: 'u-1', first_name: 'John', last_name: 'Doe' },
          },
        ],
        total: 1,
      };
      mockService.getRatingsForEntity.mockResolvedValue(mockRatings);

      const result = await controller.getEventDirectorRatings('ed-1');

      expect(mockService.getRatingsForEntity).toHaveBeenCalledWith('event_director', 'ed-1', {
        limit: undefined,
        offset: undefined,
      });
      expect(result.total).toBe(1);
      expect(result.ratings[0].rater).toBeNull(); // anonymous
    });

    it('should parse limit and offset query params', async () => {
      mockService.getRatingsForEntity.mockResolvedValue({ ratings: [], total: 0 });

      await controller.getEventDirectorRatings('ed-1', '20', '0');

      expect(mockService.getRatingsForEntity).toHaveBeenCalledWith('event_director', 'ed-1', {
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('getJudgeRatingSummary', () => {
    it('should return rating summary for a judge', async () => {
      const mockSummary = {
        entityId: 'judge-1',
        entityType: 'judge',
        averageRating: 4.5,
        totalRatings: 10,
        ratingDistribution: { '1': 0, '2': 0, '3': 1, '4': 4, '5': 5 },
      };
      mockService.getRatingSummary.mockResolvedValue(mockSummary);

      const result = await controller.getJudgeRatingSummary('judge-1');

      expect(mockService.getRatingSummary).toHaveBeenCalledWith('judge', 'judge-1');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getEventDirectorRatingSummary', () => {
    it('should return rating summary for an event director', async () => {
      const mockSummary = {
        entityId: 'ed-1',
        entityType: 'event_director',
        averageRating: 3.8,
        totalRatings: 5,
        ratingDistribution: { '1': 0, '2': 1, '3': 1, '4': 2, '5': 1 },
      };
      mockService.getRatingSummary.mockResolvedValue(mockSummary);

      const result = await controller.getEventDirectorRatingSummary('ed-1');

      expect(mockService.getRatingSummary).toHaveBeenCalledWith('event_director', 'ed-1');
      expect(result).toEqual(mockSummary);
    });
  });

  // ====================================================================
  // AUTHENTICATED ENDPOINTS
  // ====================================================================

  describe('hasUserCompetedAtEvent', () => {
    it('should return competed status for authenticated user', async () => {
      mockAuthSuccess();
      mockService.hasUserCompetedAtEvent.mockResolvedValue(true);

      const result = await controller.hasUserCompetedAtEvent('event-1', VALID_AUTH_HEADER);

      expect(mockService.hasUserCompetedAtEvent).toHaveBeenCalledWith('event-1', TEST_USER_ID);
      expect(result).toEqual({ competed: true });
    });

    it('should return false when user has not competed', async () => {
      mockAuthSuccess();
      mockService.hasUserCompetedAtEvent.mockResolvedValue(false);

      const result = await controller.hasUserCompetedAtEvent('event-1', VALID_AUTH_HEADER);

      expect(result).toEqual({ competed: false });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.hasUserCompetedAtEvent('event-1', undefined),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getEventRateableEntities', () => {
    it('should return rateable entities for authenticated user', async () => {
      mockAuthSuccess();
      const mockEntities = {
        judges: [{ id: 'j-1', name: 'Judge 1', level: 'Level 1', alreadyRated: false }],
        eventDirectors: [{ id: 'ed-1', name: 'ED 1', alreadyRated: true }],
      };
      mockService.getEventRateableEntities.mockResolvedValue(mockEntities);

      const result = await controller.getEventRateableEntities('event-1', VALID_AUTH_HEADER);

      expect(mockService.getEventRateableEntities).toHaveBeenCalledWith('event-1', TEST_USER_ID);
      expect(result).toEqual(mockEntities);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getEventRateableEntities('event-1', undefined),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('createRating', () => {
    it('should create a rating and return formatted response', async () => {
      mockAuthSuccess();
      const mockCreated = {
        id: 'rating-1',
        rating: 5,
        comment: 'Excellent',
        isAnonymous: true,
        createdAt: new Date('2026-01-15'),
      };
      mockService.createRating.mockResolvedValue(mockCreated);

      const dto = {
        event_id: 'event-1',
        rated_entity_type: 'judge',
        rated_entity_id: 'judge-1',
        rating: 5,
        comment: 'Excellent',
        is_anonymous: true,
      };

      const result = await controller.createRating(VALID_AUTH_HEADER, dto as any);

      expect(mockService.createRating).toHaveBeenCalledWith(TEST_USER_ID, dto);
      expect(result).toEqual({
        id: 'rating-1',
        rating: 5,
        comment: 'Excellent',
        isAnonymous: true,
        createdAt: mockCreated.createdAt,
      });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.createRating(undefined as any, {} as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.createRating).not.toHaveBeenCalled();
    });
  });

  describe('getMyRatings', () => {
    it('should return ratings submitted by authenticated user', async () => {
      mockAuthSuccess();
      const mockRatings = {
        ratings: [
          {
            id: 'r-1',
            ratedEntityType: 'judge',
            ratedEntityId: 'judge-1',
            rating: 5,
            comment: 'Great',
            isAnonymous: true,
            createdAt: new Date('2026-01-15'),
            event: { id: 'e-1', title: 'Event 1', eventDate: new Date('2026-01-10') },
          },
        ],
        total: 1,
      };
      mockService.getMyRatings.mockResolvedValue(mockRatings);

      const result = await controller.getMyRatings(VALID_AUTH_HEADER);

      expect(mockService.getMyRatings).toHaveBeenCalledWith(TEST_USER_ID, {
        limit: undefined,
        offset: undefined,
      });
      expect(result.total).toBe(1);
      expect(result.ratings[0].id).toBe('r-1');
      expect(result.ratings[0].event.name).toBe('Event 1');
    });

    it('should parse limit and offset query params', async () => {
      mockAuthSuccess();
      mockService.getMyRatings.mockResolvedValue({ ratings: [], total: 0 });

      await controller.getMyRatings(VALID_AUTH_HEADER, '10', '5');

      expect(mockService.getMyRatings).toHaveBeenCalledWith(TEST_USER_ID, {
        limit: 10,
        offset: 5,
      });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getMyRatings(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('deleteRating', () => {
    it('should delete own rating and return success', async () => {
      mockAuthSuccess();
      mockService.deleteRating.mockResolvedValue(undefined);

      const result = await controller.deleteRating('rating-1', VALID_AUTH_HEADER);

      expect(mockService.deleteRating).toHaveBeenCalledWith('rating-1', TEST_USER_ID, false);
      expect(result).toEqual({ success: true });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.deleteRating('rating-1', undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.deleteRating).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS
  // ====================================================================

  describe('getEventRatings', () => {
    it('should return all ratings for an event when admin', async () => {
      mockAdminAuth();
      const mockRatings = [
        {
          id: 'r-1',
          ratedEntityType: 'judge',
          ratedEntityId: 'judge-1',
          rating: 5,
          comment: 'Great',
          isAnonymous: false,
          createdAt: new Date('2026-01-15'),
          ratedBy: { id: 'u-1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
        },
      ];
      mockService.getEventRatings.mockResolvedValue(mockRatings);

      const result = await controller.getEventRatings('event-1', ADMIN_AUTH_HEADER);

      expect(mockService.getEventRatings).toHaveBeenCalledWith('event-1');
      expect(result).toHaveLength(1);
      expect(result[0].ratedBy.email).toBe('john@test.com');
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getEventRatings('event-1', VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.getEventRatings).not.toHaveBeenCalled();
    });
  });

  describe('adminDeleteRating', () => {
    it('should delete any rating as admin', async () => {
      mockAdminAuth();
      mockService.deleteRating.mockResolvedValue(undefined);

      const result = await controller.adminDeleteRating('rating-1', ADMIN_AUTH_HEADER);

      expect(mockService.deleteRating).toHaveBeenCalledWith('rating-1', TEST_ADMIN_ID, true);
      expect(result).toEqual({ success: true });
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminDeleteRating('rating-1', VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.deleteRating).not.toHaveBeenCalled();
    });
  });

  describe('getAdminAnalytics', () => {
    it('should return admin analytics when admin', async () => {
      mockAdminAuth();
      const mockAnalytics = {
        totalRatings: 100,
        judgeRatings: 60,
        edRatings: 40,
        averageJudgeRating: 4.2,
        averageEdRating: 3.8,
        ratingsThisMonth: 15,
        ratingsByMonth: [{ month: '2026-01', count: 15 }],
      };
      mockService.getAdminAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAdminAnalytics(ADMIN_AUTH_HEADER);

      expect(mockService.getAdminAnalytics).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAnalytics);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.getAdminAnalytics(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.getAdminAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('getAllRatings', () => {
    it('should return all ratings with filters when admin', async () => {
      mockAdminAuth();
      const mockResult = {
        ratings: [
          {
            id: 'r-1',
            ratedEntityType: 'judge',
            ratedEntityId: 'judge-1',
            rating: 5,
            comment: 'Great',
            isAnonymous: true,
            createdAt: new Date('2026-01-15'),
            event: { id: 'e-1', title: 'Event 1', eventDate: new Date('2026-01-10') },
            ratedBy: { id: 'u-1', first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
          },
        ],
        total: 1,
      };
      mockService.getAllRatings.mockResolvedValue(mockResult);

      const result = await controller.getAllRatings(ADMIN_AUTH_HEADER, 'judge', '10', '0');

      expect(mockService.getAllRatings).toHaveBeenCalledWith({
        entityType: 'judge',
        limit: 10,
        offset: 0,
      });
      expect(result.total).toBe(1);
      expect(result.ratings[0].ratedBy.email).toBe('john@test.com');
    });

    it('should handle missing optional filters', async () => {
      mockAdminAuth();
      mockService.getAllRatings.mockResolvedValue({ ratings: [], total: 0 });

      await controller.getAllRatings(ADMIN_AUTH_HEADER);

      expect(mockService.getAllRatings).toHaveBeenCalledWith({
        entityType: undefined,
        limit: undefined,
        offset: undefined,
      });
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.getAllRatings(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.getAllRatings).not.toHaveBeenCalled();
    });
  });

  describe('getTopRated', () => {
    it('should return top rated entities when admin', async () => {
      mockAdminAuth();
      const mockTopRated = [
        { entityId: 'j-1', entityName: 'Judge 1', averageRating: 4.9, totalRatings: 20 },
        { entityId: 'j-2', entityName: 'Judge 2', averageRating: 4.5, totalRatings: 15 },
      ];
      mockService.getTopRated.mockResolvedValue(mockTopRated);

      const result = await controller.getTopRated(ADMIN_AUTH_HEADER, 'judge');

      expect(mockService.getTopRated).toHaveBeenCalledWith('judge', 10);
      expect(result).toEqual(mockTopRated);
    });

    it('should parse limit when provided', async () => {
      mockAdminAuth();
      mockService.getTopRated.mockResolvedValue([]);

      await controller.getTopRated(ADMIN_AUTH_HEADER, 'event_director', '5');

      expect(mockService.getTopRated).toHaveBeenCalledWith('event_director', 5);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getTopRated(VALID_AUTH_HEADER, 'judge'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.getTopRated).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate service errors from getRatingsForEntity', async () => {
      mockService.getRatingsForEntity.mockRejectedValue(new Error('DB error'));

      await expect(controller.getJudgeRatings('judge-1')).rejects.toThrow('DB error');
    });

    it('should propagate service errors from createRating', async () => {
      mockAuthSuccess();
      mockService.createRating.mockRejectedValue(new Error('Validation error'));

      await expect(
        controller.createRating(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow('Validation error');
    });

    it('should propagate service errors from deleteRating', async () => {
      mockAuthSuccess();
      mockService.deleteRating.mockRejectedValue(new ForbiddenException('Cannot delete'));

      await expect(
        controller.deleteRating('rating-1', VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
