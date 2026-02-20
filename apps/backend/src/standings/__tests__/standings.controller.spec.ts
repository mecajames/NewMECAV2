import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { StandingsController } from '../standings.controller';
import { StandingsService } from '../standings.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('StandingsController', () => {
  let controller: StandingsController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_ADMIN_ID = 'admin_456';
  const TEST_USER_ID = 'user_123';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';

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

  function mockAuthFailure() {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
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
      getSeasonLeaderboard: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
      getStandingsByFormat: jest.fn().mockResolvedValue([]),
      getStandingsByClass: jest.fn().mockResolvedValue([]),
      getTeamStandings: jest.fn().mockResolvedValue([]),
      getFormatSummaries: jest.fn().mockResolvedValue([]),
      getCompetitorStats: jest.fn().mockResolvedValue(null),
      getClassesWithResults: jest.fn().mockResolvedValue([]),
      clearCache: jest.fn(),
      warmStandingsCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StandingsController],
      providers: [
        { provide: StandingsService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<StandingsController>(StandingsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ====================================================================
  // AUTH HELPER (requireAdmin) - tested through admin endpoints
  // ====================================================================

  describe('requireAdmin behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.clearCache(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.clearCache('Basic some_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.clearCache('Bearer invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(controller.clearCache(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when profile is not found', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      });
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.clearCache(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ====================================================================
  // PUBLIC ENDPOINTS
  // ====================================================================

  describe('getSeasonLeaderboard', () => {
    it('should delegate to service with default limit and offset', async () => {
      const mockResult = { entries: [{ mecaId: '123', totalPoints: 100 }], total: 1 };
      mockService.getSeasonLeaderboard.mockResolvedValue(mockResult);

      const result = await controller.getSeasonLeaderboard();

      expect(mockService.getSeasonLeaderboard).toHaveBeenCalledWith(undefined, 100, 0);
      expect(result).toEqual(mockResult);
    });

    it('should pass all provided query parameters', async () => {
      await controller.getSeasonLeaderboard('season-1', '50', '10');

      expect(mockService.getSeasonLeaderboard).toHaveBeenCalledWith('season-1', 50, 10);
    });

    it('should parse string limit and offset to integers', async () => {
      await controller.getSeasonLeaderboard(undefined, '25', '5');

      expect(mockService.getSeasonLeaderboard).toHaveBeenCalledWith(undefined, 25, 5);
    });
  });

  describe('getStandingsByFormat', () => {
    it('should delegate to service with format and default limit', async () => {
      const mockEntries = [{ mecaId: '123', totalPoints: 100, rank: 1 }];
      mockService.getStandingsByFormat.mockResolvedValue(mockEntries);

      const result = await controller.getStandingsByFormat('SPL');

      expect(mockService.getStandingsByFormat).toHaveBeenCalledWith('SPL', undefined, 50);
      expect(result).toEqual(mockEntries);
    });

    it('should pass seasonId and limit when provided', async () => {
      await controller.getStandingsByFormat('SQL', 'season-1', '25');

      expect(mockService.getStandingsByFormat).toHaveBeenCalledWith('SQL', 'season-1', 25);
    });
  });

  describe('getStandingsByClass', () => {
    it('should delegate to service with format, className, and default limit', async () => {
      const mockEntries = [{ mecaId: '123', totalPoints: 50, rank: 1 }];
      mockService.getStandingsByClass.mockResolvedValue(mockEntries);

      const result = await controller.getStandingsByClass('SPL', 'Amateur');

      expect(mockService.getStandingsByClass).toHaveBeenCalledWith('SPL', 'Amateur', undefined, 50);
      expect(result).toEqual(mockEntries);
    });

    it('should pass seasonId and limit when provided', async () => {
      await controller.getStandingsByClass('MK', 'Pro', 'season-1', '10');

      expect(mockService.getStandingsByClass).toHaveBeenCalledWith('MK', 'Pro', 'season-1', 10);
    });
  });

  describe('getTeamStandings', () => {
    it('should delegate to service with default limit', async () => {
      const mockEntries = [{ teamId: 'team-1', totalPoints: 200 }];
      mockService.getTeamStandings.mockResolvedValue(mockEntries);

      const result = await controller.getTeamStandings();

      expect(mockService.getTeamStandings).toHaveBeenCalledWith(undefined, 50);
      expect(result).toEqual(mockEntries);
    });

    it('should pass seasonId and limit when provided', async () => {
      await controller.getTeamStandings('season-1', '20');

      expect(mockService.getTeamStandings).toHaveBeenCalledWith('season-1', 20);
    });
  });

  describe('getFormatSummaries', () => {
    it('should delegate to service with optional seasonId', async () => {
      const mockSummaries = [{ format: 'SPL', totalCompetitors: 10 }];
      mockService.getFormatSummaries.mockResolvedValue(mockSummaries);

      const result = await controller.getFormatSummaries();

      expect(mockService.getFormatSummaries).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockSummaries);
    });

    it('should pass seasonId when provided', async () => {
      await controller.getFormatSummaries('season-1');

      expect(mockService.getFormatSummaries).toHaveBeenCalledWith('season-1');
    });
  });

  describe('getCompetitorStats', () => {
    it('should delegate to service with mecaId', async () => {
      const mockStats = { mecaId: '12345', totalPoints: 500, ranking: 1 };
      mockService.getCompetitorStats.mockResolvedValue(mockStats);

      const result = await controller.getCompetitorStats('12345');

      expect(mockService.getCompetitorStats).toHaveBeenCalledWith('12345', undefined);
      expect(result).toEqual(mockStats);
    });

    it('should pass seasonId when provided', async () => {
      await controller.getCompetitorStats('12345', 'season-1');

      expect(mockService.getCompetitorStats).toHaveBeenCalledWith('12345', 'season-1');
    });

    it('should return null when competitor is not found', async () => {
      mockService.getCompetitorStats.mockResolvedValue(null);

      const result = await controller.getCompetitorStats('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getClassesWithResults', () => {
    it('should delegate to service with optional format and seasonId', async () => {
      const mockClasses = [{ format: 'SPL', className: 'Amateur', resultCount: 10 }];
      mockService.getClassesWithResults.mockResolvedValue(mockClasses);

      const result = await controller.getClassesWithResults();

      expect(mockService.getClassesWithResults).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockClasses);
    });

    it('should pass format and seasonId when provided', async () => {
      await controller.getClassesWithResults('SPL', 'season-1');

      expect(mockService.getClassesWithResults).toHaveBeenCalledWith('SPL', 'season-1');
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS
  // ====================================================================

  describe('clearCache', () => {
    it('should clear cache when called by admin', async () => {
      mockAdminAuth();

      await controller.clearCache(ADMIN_AUTH_HEADER);

      expect(mockService.clearCache).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.clearCache(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.clearCache).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no auth header', async () => {
      await expect(controller.clearCache(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockService.clearCache).not.toHaveBeenCalled();
    });
  });

  describe('warmCache', () => {
    it('should warm cache and return success message when called by admin', async () => {
      mockAdminAuth();

      const result = await controller.warmCache(ADMIN_AUTH_HEADER);

      expect(mockService.warmStandingsCache).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Cache warmed successfully' });
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.warmCache(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.warmStandingsCache).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no auth header', async () => {
      await expect(controller.warmCache(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockService.warmStandingsCache).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate service errors from getSeasonLeaderboard', async () => {
      mockService.getSeasonLeaderboard.mockRejectedValue(new Error('DB error'));

      await expect(controller.getSeasonLeaderboard()).rejects.toThrow('DB error');
    });

    it('should propagate service errors from getStandingsByFormat', async () => {
      mockService.getStandingsByFormat.mockRejectedValue(new Error('DB error'));

      await expect(controller.getStandingsByFormat('SPL')).rejects.toThrow('DB error');
    });

    it('should propagate service errors from warmCache', async () => {
      mockAdminAuth();
      mockService.warmStandingsCache.mockRejectedValue(new Error('Cache error'));

      await expect(controller.warmCache(ADMIN_AUTH_HEADER)).rejects.toThrow('Cache error');
    });
  });
});
