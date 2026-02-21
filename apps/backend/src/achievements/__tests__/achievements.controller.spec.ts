import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AchievementsController } from '../achievements.controller';
import { AchievementsService } from '../achievements.service';
import { AchievementImageService } from '../image-generator/achievement-image.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('AchievementsController', () => {
  let controller: AchievementsController;
  let mockService: Record<string, jest.Mock>;
  let mockImageService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_ADMIN_ID = 'admin-user-123';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';

  // ----------------------------------------------------------------
  // Auth helpers
  // ----------------------------------------------------------------

  function mockAdminAuth(userId: string = TEST_ADMIN_ID) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    (mockEm.findOne as jest.Mock).mockResolvedValue({ id: userId, role: UserRole.ADMIN });
  }

  function mockNonAdminAuth(userId: string = 'user-456') {
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

  // ----------------------------------------------------------------
  // Setup
  // ----------------------------------------------------------------

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
      getAchievementsForProfile: jest.fn().mockResolvedValue([]),
      getAchievementsForMecaId: jest.fn().mockResolvedValue([]),
      getAllTemplates: jest.fn().mockResolvedValue([]),
      getTemplateByKey: jest.fn().mockResolvedValue({}),
      getAllDefinitions: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
      getDefinitionById: jest.fn().mockResolvedValue({}),
      createDefinition: jest.fn().mockResolvedValue({}),
      updateDefinition: jest.fn().mockResolvedValue({}),
      deleteDefinition: jest.fn().mockResolvedValue({ success: true }),
      getRecipients: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
      deleteRecipient: jest.fn().mockResolvedValue({ success: true, deleted: { id: 'rec-1', achievement_name: 'Test', profile_name: 'User' } }),
      backfillAchievements: jest.fn().mockResolvedValue({ processed: 0, awarded: 0, total: 0 }),
      backfillAchievementsWithProgress: jest.fn(),
      checkAndAwardAchievements: jest.fn().mockResolvedValue([]),
      getEligibleProfilesForAchievement: jest.fn().mockResolvedValue([]),
      manualAwardAchievement: jest.fn().mockResolvedValue({
        id: 'rec-1',
        achievement: { name: 'Test Achievement' },
        profile: { first_name: 'John', last_name: 'Doe' },
        mecaId: '12345',
        achievedValue: 135,
      }),
    };

    mockImageService = {
      generateMissingImages: jest.fn().mockResolvedValue({ generated: 0, failed: 0 }),
      generateImageForRecipient: jest.fn().mockResolvedValue(true),
      deleteImage: jest.fn().mockResolvedValue(true),
      checkAssets: jest.fn().mockResolvedValue({ configured: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AchievementsController],
      providers: [
        { provide: AchievementsService, useValue: mockService },
        { provide: AchievementImageService, useValue: mockImageService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<AchievementsController>(AchievementsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ================================================================
  // requireAdmin behavior
  // ================================================================

  describe('requireAdmin behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.getAllDefinitions(undefined as any, {} as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.getAllDefinitions('Basic token', {} as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.getAllDefinitions('Bearer invalid', {} as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.getAllDefinitions(ADMIN_AUTH_HEADER, {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when profile not found', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.getAllDefinitions(ADMIN_AUTH_HEADER, {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should succeed when user has admin role', async () => {
      mockAdminAuth();

      const result = await controller.getAllDefinitions(ADMIN_AUTH_HEADER, {} as any);

      expect(result).toBeDefined();
      expect(mockService.getAllDefinitions).toHaveBeenCalled();
    });
  });

  // ================================================================
  // Public Endpoints
  // ================================================================

  describe('getAchievementsForProfile', () => {
    it('should return achievements with total count', async () => {
      const achievements = [
        { id: 'rec-1', achievement_name: 'dB Club 130' },
        { id: 'rec-2', achievement_name: 'dB Club 140' },
      ];
      mockService.getAchievementsForProfile.mockResolvedValue(achievements);

      const result = await controller.getAchievementsForProfile('profile-1');

      expect(mockService.getAchievementsForProfile).toHaveBeenCalledWith('profile-1');
      expect(result.achievements).toEqual(achievements);
      expect(result.total_count).toBe(2);
    });

    it('should return empty achievements array', async () => {
      mockService.getAchievementsForProfile.mockResolvedValue([]);

      const result = await controller.getAchievementsForProfile('profile-1');

      expect(result.achievements).toEqual([]);
      expect(result.total_count).toBe(0);
    });
  });

  describe('getAchievementsForMecaId', () => {
    it('should return achievements with total count', async () => {
      const achievements = [{ id: 'rec-1', achievement_name: 'dB Club 130' }];
      mockService.getAchievementsForMecaId.mockResolvedValue(achievements);

      const result = await controller.getAchievementsForMecaId('12345');

      expect(mockService.getAchievementsForMecaId).toHaveBeenCalledWith('12345');
      expect(result.achievements).toEqual(achievements);
      expect(result.total_count).toBe(1);
    });

    it('should return empty achievements', async () => {
      mockService.getAchievementsForMecaId.mockResolvedValue([]);

      const result = await controller.getAchievementsForMecaId('99999');

      expect(result.total_count).toBe(0);
    });
  });

  describe('getTemplates', () => {
    it('should delegate to service.getAllTemplates', async () => {
      const templates = [{ key: 'db-club', name: 'dB Club' }];
      mockService.getAllTemplates.mockResolvedValue(templates);

      const result = await controller.getTemplates();

      expect(mockService.getAllTemplates).toHaveBeenCalled();
      expect(result).toEqual(templates);
    });
  });

  describe('getTemplateByKey', () => {
    it('should delegate to service.getTemplateByKey', async () => {
      const template = { key: 'db-club', name: 'dB Club' };
      mockService.getTemplateByKey.mockResolvedValue(template);

      const result = await controller.getTemplateByKey('db-club');

      expect(mockService.getTemplateByKey).toHaveBeenCalledWith('db-club');
      expect(result).toEqual(template);
    });
  });

  // ================================================================
  // Admin Endpoints - Definitions
  // ================================================================

  describe('getAllDefinitions', () => {
    it('should delegate to service with query params', async () => {
      mockAdminAuth();
      const query = { format: 'SPL', page: 1, limit: 20 };
      const expected = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockService.getAllDefinitions.mockResolvedValue(expected);

      const result = await controller.getAllDefinitions(ADMIN_AUTH_HEADER, query as any);

      expect(mockService.getAllDefinitions).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.getAllDefinitions(ADMIN_AUTH_HEADER, {} as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.getAllDefinitions).not.toHaveBeenCalled();
    });
  });

  describe('getDefinitionById', () => {
    it('should delegate to service with ID', async () => {
      mockAdminAuth();
      const expected = { id: 'def-1', name: 'Test' };
      mockService.getDefinitionById.mockResolvedValue(expected);

      const result = await controller.getDefinitionById(ADMIN_AUTH_HEADER, 'def-1');

      expect(mockService.getDefinitionById).toHaveBeenCalledWith('def-1');
      expect(result).toEqual(expected);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.getDefinitionById(ADMIN_AUTH_HEADER, 'def-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createDefinition', () => {
    it('should delegate to service with DTO', async () => {
      mockAdminAuth();
      const dto = { name: 'New Achievement', template_key: 'test', threshold_value: 100 };
      const expected = { id: 'new-1', name: 'New Achievement' };
      mockService.createDefinition.mockResolvedValue(expected);

      const result = await controller.createDefinition(ADMIN_AUTH_HEADER, dto as any);

      expect(mockService.createDefinition).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.createDefinition(ADMIN_AUTH_HEADER, {} as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.createDefinition).not.toHaveBeenCalled();
    });
  });

  describe('updateDefinition', () => {
    it('should delegate to service with ID and DTO', async () => {
      mockAdminAuth();
      const dto = { name: 'Updated Name' };
      const expected = { id: 'def-1', name: 'Updated Name' };
      mockService.updateDefinition.mockResolvedValue(expected);

      const result = await controller.updateDefinition(ADMIN_AUTH_HEADER, 'def-1', dto as any);

      expect(mockService.updateDefinition).toHaveBeenCalledWith('def-1', dto);
      expect(result).toEqual(expected);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.updateDefinition(ADMIN_AUTH_HEADER, 'def-1', {} as any)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.updateDefinition).not.toHaveBeenCalled();
    });
  });

  describe('deleteDefinition', () => {
    it('should delegate to service with ID', async () => {
      mockAdminAuth();
      mockService.deleteDefinition.mockResolvedValue({ success: true });

      const result = await controller.deleteDefinition(ADMIN_AUTH_HEADER, 'def-1');

      expect(mockService.deleteDefinition).toHaveBeenCalledWith('def-1');
      expect(result).toEqual({ success: true });
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.deleteDefinition(ADMIN_AUTH_HEADER, 'def-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.deleteDefinition).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // Admin Endpoints - Recipients
  // ================================================================

  describe('getRecipients', () => {
    it('should delegate to service with query', async () => {
      mockAdminAuth();
      const query = { achievement_id: 'def-1', page: 1, limit: 20 };
      const expected = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockService.getRecipients.mockResolvedValue(expected);

      const result = await controller.getRecipients(ADMIN_AUTH_HEADER, query as any);

      expect(mockService.getRecipients).toHaveBeenCalledWith(query);
      expect(result).toEqual(expected);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.getRecipients(ADMIN_AUTH_HEADER, {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteRecipient', () => {
    it('should delegate to service', async () => {
      mockAdminAuth();
      const expected = { success: true, deleted: { id: 'rec-1', achievement_name: 'Test', profile_name: 'User' } };
      mockService.deleteRecipient.mockResolvedValue(expected);

      const result = await controller.deleteRecipient(ADMIN_AUTH_HEADER, 'rec-1');

      expect(mockService.deleteRecipient).toHaveBeenCalledWith('rec-1');
      expect(result).toEqual(expected);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.deleteRecipient(ADMIN_AUTH_HEADER, 'rec-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ================================================================
  // Admin Endpoints - Backfill
  // ================================================================

  describe('triggerBackfill', () => {
    it('should delegate to service without dates', async () => {
      mockAdminAuth();
      const expected = { processed: 10, awarded: 2, total: 10 };
      mockService.backfillAchievements.mockResolvedValue(expected);

      const result = await controller.triggerBackfill(ADMIN_AUTH_HEADER);

      expect(mockService.backfillAchievements).toHaveBeenCalledWith({});
      expect(result).toEqual(expected);
    });

    it('should parse and pass date options', async () => {
      mockAdminAuth();

      await controller.triggerBackfill(ADMIN_AUTH_HEADER, '2026-01-01', '2026-12-31');

      const calledWith = mockService.backfillAchievements.mock.calls[0][0];
      expect(calledWith.startDate).toBeInstanceOf(Date);
      expect(calledWith.endDate).toBeInstanceOf(Date);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.triggerBackfill(ADMIN_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ================================================================
  // Admin Endpoints - Check Result
  // ================================================================

  describe('checkResultForAchievements', () => {
    it('should delegate to service and return formatted response', async () => {
      mockAdminAuth();
      mockService.checkAndAwardAchievements.mockResolvedValue([
        { id: 'rec-1', achievement: { name: 'dB Club 130' }, achievedValue: 135 },
      ]);

      const result = await controller.checkResultForAchievements(ADMIN_AUTH_HEADER, 'result-1');

      expect(mockService.checkAndAwardAchievements).toHaveBeenCalledWith('result-1');
      expect(result.awarded_count).toBe(1);
      expect(result.achievements).toHaveLength(1);
      expect(result.achievements[0].id).toBe('rec-1');
      expect(result.achievements[0].achievement_name).toBe('dB Club 130');
      expect(result.achievements[0].achieved_value).toBe(135);
    });

    it('should return zero awarded when no achievements match', async () => {
      mockAdminAuth();
      mockService.checkAndAwardAchievements.mockResolvedValue([]);

      const result = await controller.checkResultForAchievements(ADMIN_AUTH_HEADER, 'result-1');

      expect(result.awarded_count).toBe(0);
      expect(result.achievements).toEqual([]);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.checkResultForAchievements(ADMIN_AUTH_HEADER, 'result-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ================================================================
  // Admin Endpoints - Image Generation
  // ================================================================

  describe('generateMissingImages', () => {
    it('should delegate to image service', async () => {
      mockAdminAuth();
      const expected = { generated: 5, failed: 1 };
      mockImageService.generateMissingImages.mockResolvedValue(expected);

      const result = await controller.generateMissingImages(ADMIN_AUTH_HEADER);

      expect(mockImageService.generateMissingImages).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.generateMissingImages(ADMIN_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('regenerateImageForRecipient', () => {
    it('should return not found when recipient does not exist', async () => {
      mockAdminAuth();
      // Override findOne to return null for AchievementRecipient after admin auth
      // First findOne call is for admin auth profile check
      const findOneMock = mockEm.findOne as jest.Mock;
      findOneMock
        .mockResolvedValueOnce({ id: TEST_ADMIN_ID, role: UserRole.ADMIN }) // admin check
        .mockResolvedValueOnce(null); // recipient not found

      const result = await controller.regenerateImageForRecipient(ADMIN_AUTH_HEADER, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Recipient not found');
    });

    it('should generate image and return success when recipient exists', async () => {
      mockAdminAuth();
      const findOneMock = mockEm.findOne as jest.Mock;
      findOneMock
        .mockResolvedValueOnce({ id: TEST_ADMIN_ID, role: UserRole.ADMIN }) // admin check
        .mockResolvedValueOnce({ // recipient before
          id: 'rec-1',
          achievement: { id: 'def-1', name: 'dB Club 130', templateKey: 'db-club', renderValue: 130 },
          achievedValue: 135,
          imageUrl: null,
        })
        .mockResolvedValueOnce({ // recipient after
          id: 'rec-1',
          imageUrl: 'https://example.com/new-image.png',
        });

      const result = await controller.regenerateImageForRecipient(ADMIN_AUTH_HEADER, 'rec-1');

      expect(mockImageService.generateImageForRecipient).toHaveBeenCalledWith('rec-1');
      expect(result.success).toBe(true);
      expect(result.newImageUrl).toBe('https://example.com/new-image.png');
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.regenerateImageForRecipient(ADMIN_AUTH_HEADER, 'rec-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('checkAssets', () => {
    it('should delegate to image service', async () => {
      mockAdminAuth();
      const expected = { configured: true };
      mockImageService.checkAssets.mockResolvedValue(expected);

      const result = await controller.checkAssets(ADMIN_AUTH_HEADER);

      expect(mockImageService.checkAssets).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.checkAssets(ADMIN_AUTH_HEADER)).rejects.toThrow(ForbiddenException);
    });
  });

  // ================================================================
  // Admin Endpoints - Manual Award
  // ================================================================

  describe('getEligibleProfiles', () => {
    it('should delegate to service with achievement ID and search', async () => {
      mockAdminAuth();
      const expected = [{ id: 'p-1', meca_id: '111', name: 'John Doe', email: 'john@example.com' }];
      mockService.getEligibleProfilesForAchievement.mockResolvedValue(expected);

      const result = await controller.getEligibleProfiles(ADMIN_AUTH_HEADER, 'def-1', 'john');

      expect(mockService.getEligibleProfilesForAchievement).toHaveBeenCalledWith('def-1', 'john');
      expect(result).toEqual(expected);
    });

    it('should delegate without search term', async () => {
      mockAdminAuth();

      await controller.getEligibleProfiles(ADMIN_AUTH_HEADER, 'def-1');

      expect(mockService.getEligibleProfilesForAchievement).toHaveBeenCalledWith('def-1', undefined);
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(controller.getEligibleProfiles(ADMIN_AUTH_HEADER, 'def-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('manualAwardAchievement', () => {
    it('should delegate to service and return formatted response', async () => {
      mockAdminAuth();
      mockService.manualAwardAchievement.mockResolvedValue({
        id: 'rec-1',
        achievement: { name: 'dB Club 130' },
        profile: { first_name: 'John', last_name: 'Doe' },
        mecaId: '12345',
        achievedValue: 135,
      });

      const dto = {
        profile_id: 'profile-1',
        achievement_id: 'def-1',
        achieved_value: 135,
        notes: 'Manual award',
      };

      const result = await controller.manualAwardAchievement(ADMIN_AUTH_HEADER, dto);

      expect(mockService.manualAwardAchievement).toHaveBeenCalledWith(dto);
      expect(result.success).toBe(true);
      expect(result.recipient.id).toBe('rec-1');
      expect(result.recipient.achievement_name).toBe('dB Club 130');
      expect(result.recipient.profile_name).toBe('John Doe');
      expect(result.recipient.meca_id).toBe('12345');
      expect(result.recipient.achieved_value).toBe(135);
    });

    it('should handle profile with only first_name', async () => {
      mockAdminAuth();
      mockService.manualAwardAchievement.mockResolvedValue({
        id: 'rec-1',
        achievement: { name: 'Test' },
        profile: { first_name: 'Jane', last_name: '' },
        mecaId: '111',
        achievedValue: 100,
      });

      const result = await controller.manualAwardAchievement(ADMIN_AUTH_HEADER, {
        profile_id: 'p-1',
        achievement_id: 'd-1',
        achieved_value: 100,
      });

      expect(result.recipient.profile_name).toBe('Jane');
    });

    it('should handle missing profile', async () => {
      mockAdminAuth();
      mockService.manualAwardAchievement.mockResolvedValue({
        id: 'rec-1',
        achievement: { name: 'Test' },
        profile: null,
        mecaId: '111',
        achievedValue: 100,
      });

      const result = await controller.manualAwardAchievement(ADMIN_AUTH_HEADER, {
        profile_id: 'p-1',
        achievement_id: 'd-1',
        achieved_value: 100,
      });

      expect(result.recipient.profile_name).toBe('Unknown');
    });

    it('should reject non-admin users', async () => {
      mockNonAdminAuth();

      await expect(
        controller.manualAwardAchievement(ADMIN_AUTH_HEADER, {
          profile_id: 'p-1',
          achievement_id: 'd-1',
          achieved_value: 100,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.manualAwardAchievement).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // Service error propagation
  // ================================================================

  describe('service error propagation', () => {
    it('should propagate errors from public endpoints', async () => {
      mockService.getAchievementsForProfile.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAchievementsForProfile('profile-1')).rejects.toThrow('DB error');
    });

    it('should propagate errors from admin endpoints', async () => {
      mockAdminAuth();
      mockService.createDefinition.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.createDefinition(ADMIN_AUTH_HEADER, {} as any)).rejects.toThrow(
        'Validation failed',
      );
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.getTemplateByKey.mockRejectedValue(
        new Error('Achievement template with key nonexistent not found'),
      );

      await expect(controller.getTemplateByKey('nonexistent')).rejects.toThrow(
        'Achievement template with key nonexistent not found',
      );
    });
  });
});
