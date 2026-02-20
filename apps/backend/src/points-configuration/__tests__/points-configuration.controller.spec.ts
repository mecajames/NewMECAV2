import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PointsConfigurationController } from '../points-configuration.controller';
import { PointsConfigurationService } from '../points-configuration.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('PointsConfigurationController', () => {
  let controller: PointsConfigurationController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_ADMIN_ID = 'admin_123';
  const TEST_USER_ID = 'user_456';
  const TEST_SEASON_ID = 'season_789';
  const TEST_CONFIG_ID = 'config_abc';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';
  const USER_AUTH_HEADER = 'Bearer user_token_abc';

  const mockConfig = {
    id: TEST_CONFIG_ID,
    season: { id: TEST_SEASON_ID },
    standard1stPlace: 5,
    standard2ndPlace: 4,
    standard3rdPlace: 3,
    standard4thPlace: 2,
    standard5thPlace: 1,
    fourX1stPlace: 30,
    fourX2ndPlace: 27,
    fourX3rdPlace: 24,
    fourX4thPlace: 21,
    fourX5thPlace: 18,
    fourXExtendedEnabled: false,
    fourXExtendedPoints: 15,
    fourXExtendedMaxPlace: 50,
    isActive: true,
    toJSON: jest.fn().mockReturnValue({
      id: TEST_CONFIG_ID,
      season_id: TEST_SEASON_ID,
      standard_1st_place: 5,
      standard_2nd_place: 4,
      is_active: true,
    }),
  };

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
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(mockConfig),
      getConfigForCurrentSeason: jest.fn().mockResolvedValue(mockConfig),
      getConfigForSeason: jest.fn().mockResolvedValue(mockConfig),
      generatePointsPreview: jest.fn().mockReturnValue([]),
      update: jest.fn().mockResolvedValue(mockConfig),
      calculatePoints: jest.fn().mockReturnValue(10),
      invalidateCache: jest.fn(),
      invalidateAllCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointsConfigurationController],
      providers: [
        { provide: PointsConfigurationService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: 'EntityManager', useValue: mockEm },
      ],
    }).compile();

    controller = module.get<PointsConfigurationController>(PointsConfigurationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // requireAdmin behavior
  // ====================================================================

  describe('requireAdmin behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.findAll(undefined)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.findAll('Basic token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.findAll('Bearer bad_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when profile is not found', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      });
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.findAll('Bearer token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.findAll(USER_AUTH_HEADER)).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================================
  // Admin-protected Endpoints
  // ====================================================================

  describe('findAll', () => {
    it('should return all configs as JSON when admin', async () => {
      mockAdminAuth();
      const configs = [mockConfig, { ...mockConfig, id: 'config_2', toJSON: jest.fn().mockReturnValue({ id: 'config_2' }) }];
      mockService.findAll.mockResolvedValue(configs);

      const result = await controller.findAll(ADMIN_AUTH_HEADER);

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockNonAdminAuth();

      await expect(controller.findAll(USER_AUTH_HEADER)).rejects.toThrow(ForbiddenException);
      expect(mockService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a config by ID when admin', async () => {
      mockAdminAuth();

      const result = await controller.findById(TEST_CONFIG_ID, ADMIN_AUTH_HEADER);

      expect(mockService.findById).toHaveBeenCalledWith(TEST_CONFIG_ID);
      expect(mockConfig.toJSON).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockNonAdminAuth();

      await expect(controller.findById(TEST_CONFIG_ID, USER_AUTH_HEADER)).rejects.toThrow(ForbiddenException);
      expect(mockService.findById).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // Public Endpoints
  // ====================================================================

  describe('getCurrentSeasonConfig', () => {
    it('should return current season config as JSON', async () => {
      mockService.getConfigForCurrentSeason.mockResolvedValue(mockConfig);

      const result = await controller.getCurrentSeasonConfig();

      expect(mockService.getConfigForCurrentSeason).toHaveBeenCalledTimes(1);
      expect(mockConfig.toJSON).toHaveBeenCalled();
    });

    it('should return message when no current season found', async () => {
      mockService.getConfigForCurrentSeason.mockResolvedValue(null);

      const result = await controller.getCurrentSeasonConfig();

      expect(result).toEqual({ message: 'No current season found', config: null });
    });
  });

  describe('getConfigForSeason', () => {
    it('should return config for a specific season as JSON', async () => {
      mockService.getConfigForSeason.mockResolvedValue(mockConfig);

      const result = await controller.getConfigForSeason(TEST_SEASON_ID);

      expect(mockService.getConfigForSeason).toHaveBeenCalledWith(TEST_SEASON_ID);
      expect(mockConfig.toJSON).toHaveBeenCalled();
    });

    it('should propagate errors from service', async () => {
      mockService.getConfigForSeason.mockRejectedValue(new Error('Season not found'));

      await expect(controller.getConfigForSeason('bad_id')).rejects.toThrow('Season not found');
    });
  });

  describe('getPointsPreview', () => {
    it('should return points preview for a season', async () => {
      const preview = [
        { placement: 1, standard_1x: 5, standard_2x: 10, standard_3x: 15, four_x: 30 },
      ];
      mockService.getConfigForSeason.mockResolvedValue(mockConfig);
      mockService.generatePointsPreview.mockReturnValue(preview);

      const result = await controller.getPointsPreview(TEST_SEASON_ID);

      expect(result.season_id).toBe(TEST_SEASON_ID);
      expect(result.preview).toEqual(preview);
      expect(mockService.getConfigForSeason).toHaveBeenCalledWith(TEST_SEASON_ID);
      expect(mockService.generatePointsPreview).toHaveBeenCalledWith(mockConfig);
    });
  });

  // ====================================================================
  // Update Endpoints (Admin only)
  // ====================================================================

  describe('updateSeasonConfig', () => {
    it('should update config when admin and valid data', async () => {
      mockAdminAuth();
      const updateBody = { standard_1st_place: 10, standard_2nd_place: 8 };
      mockService.update.mockResolvedValue(mockConfig);

      const result = await controller.updateSeasonConfig(TEST_SEASON_ID, updateBody, ADMIN_AUTH_HEADER);

      expect(result.message).toBe('Points configuration updated successfully');
      expect(mockService.update).toHaveBeenCalled();
    });

    it('should return validation error for invalid data', async () => {
      mockAdminAuth();
      // Pass a value that would fail zod validation (non-numeric for a number field)
      const updateBody = { standard_1st_place: 'not_a_number' };

      const result = await controller.updateSeasonConfig(TEST_SEASON_ID, updateBody, ADMIN_AUTH_HEADER);

      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.updateSeasonConfig(TEST_SEASON_ID, {}, USER_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });

  describe('updateAndRecalculate', () => {
    it('should update config and indicate recalculation was requested', async () => {
      mockAdminAuth();
      const updateBody = { standard_1st_place: 10, recalculate: true };
      mockService.update.mockResolvedValue(mockConfig);

      const result = await controller.updateAndRecalculate(TEST_SEASON_ID, updateBody, ADMIN_AUTH_HEADER);

      expect(result.message).toBe('Points configuration updated successfully');
      expect(result.recalculation_requested).toBe(true);
    });

    it('should indicate recalculation not requested when flag is absent', async () => {
      mockAdminAuth();
      const updateBody = { standard_1st_place: 10 };
      mockService.update.mockResolvedValue(mockConfig);

      const result = await controller.updateAndRecalculate(TEST_SEASON_ID, updateBody, ADMIN_AUTH_HEADER);

      expect(result.recalculation_requested).toBe(false);
    });

    it('should return validation error for invalid data', async () => {
      mockAdminAuth();
      const updateBody = { standard_1st_place: 'invalid', recalculate: true };

      const result = await controller.updateAndRecalculate(TEST_SEASON_ID, updateBody, ADMIN_AUTH_HEADER);

      expect(result.error).toBe('Validation failed');
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.updateAndRecalculate(TEST_SEASON_ID, {}, USER_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================================
  // Calculate Points Endpoint
  // ====================================================================

  describe('calculatePoints', () => {
    it('should calculate points for given parameters', async () => {
      mockService.getConfigForSeason.mockResolvedValue(mockConfig);
      mockService.calculatePoints.mockReturnValue(15);

      const result = await controller.calculatePoints(TEST_SEASON_ID, '1', '3');

      expect(result).toEqual({
        season_id: TEST_SEASON_ID,
        placement: 1,
        multiplier: 3,
        points: 15,
      });
      expect(mockService.getConfigForSeason).toHaveBeenCalledWith(TEST_SEASON_ID);
      expect(mockService.calculatePoints).toHaveBeenCalledWith(1, 3, mockConfig);
    });

    it('should return error when required parameters are missing', async () => {
      const result = await controller.calculatePoints(undefined as any, undefined as any, undefined as any);

      expect(result).toEqual({ error: 'Missing required parameters: seasonId, placement, multiplier' });
      expect(mockService.getConfigForSeason).not.toHaveBeenCalled();
    });

    it('should return error when seasonId is missing', async () => {
      const result = await controller.calculatePoints(undefined as any, '1', '2');

      expect(result).toEqual({ error: 'Missing required parameters: seasonId, placement, multiplier' });
    });

    it('should return error when placement is missing', async () => {
      const result = await controller.calculatePoints(TEST_SEASON_ID, undefined as any, '2');

      expect(result).toEqual({ error: 'Missing required parameters: seasonId, placement, multiplier' });
    });
  });

  // ====================================================================
  // Cache Invalidation Endpoint
  // ====================================================================

  describe('invalidateCache', () => {
    it('should invalidate cache for a specific season when seasonId provided', async () => {
      mockAdminAuth();

      const result = await controller.invalidateCache(TEST_SEASON_ID, ADMIN_AUTH_HEADER);

      expect(result).toEqual({ message: `Cache invalidated for season ${TEST_SEASON_ID}` });
      expect(mockService.invalidateCache).toHaveBeenCalledWith(TEST_SEASON_ID);
      expect(mockService.invalidateAllCache).not.toHaveBeenCalled();
    });

    it('should invalidate all cache when no seasonId provided', async () => {
      mockAdminAuth();

      const result = await controller.invalidateCache(undefined, ADMIN_AUTH_HEADER);

      expect(result).toEqual({ message: 'All cache invalidated' });
      expect(mockService.invalidateAllCache).toHaveBeenCalledTimes(1);
      expect(mockService.invalidateCache).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockNonAdminAuth();

      await expect(controller.invalidateCache(undefined, USER_AUTH_HEADER)).rejects.toThrow(ForbiddenException);
      expect(mockService.invalidateCache).not.toHaveBeenCalled();
      expect(mockService.invalidateAllCache).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // Service Error Propagation
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from findAll', async () => {
      mockAdminAuth();
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.findAll(ADMIN_AUTH_HEADER)).rejects.toThrow('DB error');
    });

    it('should propagate errors from getCurrentSeasonConfig', async () => {
      mockService.getConfigForCurrentSeason.mockRejectedValue(new Error('Config error'));

      await expect(controller.getCurrentSeasonConfig()).rejects.toThrow('Config error');
    });

    it('should propagate errors from update', async () => {
      mockAdminAuth();
      mockService.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        controller.updateSeasonConfig(TEST_SEASON_ID, { standard_1st_place: 5 }, ADMIN_AUTH_HEADER),
      ).rejects.toThrow('Update failed');
    });
  });
});
