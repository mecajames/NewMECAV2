import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BannersController } from '../banners.controller';
import { BannersService } from '../banners.service';
import { AdvertisersController } from '../advertisers.controller';
import { AdvertisersService } from '../advertisers.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

// =============================================================================
// BannersController Tests
// =============================================================================

describe('BannersController', () => {
  let controller: BannersController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_USER_ID = 'user_123';
  const TEST_ADMIN_ID = 'admin_456';
  const TEST_BANNER_ID = 'banner_789';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';

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
      getActiveBanner: jest.fn().mockResolvedValue(null),
      getAllActiveBanners: jest.fn().mockResolvedValue([]),
      recordEngagement: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: TEST_BANNER_ID, name: 'Test Banner' }),
      update: jest.fn().mockResolvedValue({ id: TEST_BANNER_ID, name: 'Updated Banner' }),
      delete: jest.fn().mockResolvedValue(undefined),
      getBannerAnalytics: jest.fn().mockResolvedValue({}),
      getAllBannersAnalytics: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BannersController],
      providers: [
        { provide: BannersService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<BannersController>(BannersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // PUBLIC ENDPOINTS (no auth required)
  // ====================================================================

  describe('getActiveBanner', () => {
    it('should return an active banner for a given position', async () => {
      const banner = { id: TEST_BANNER_ID, imageUrl: 'https://example.com/banner.png' };
      mockService.getActiveBanner.mockResolvedValue(banner);

      const result = await controller.getActiveBanner('hero' as any);

      expect(result).toEqual(banner);
      expect(mockService.getActiveBanner).toHaveBeenCalledWith('hero');
    });

    it('should return null when no active banner exists', async () => {
      mockService.getActiveBanner.mockResolvedValue(null);

      const result = await controller.getActiveBanner('sidebar' as any);

      expect(result).toBeNull();
    });
  });

  describe('getAllActiveBanners', () => {
    it('should return all active banners for a given position', async () => {
      const banners = [
        { id: '1', imageUrl: 'https://example.com/banner1.png' },
        { id: '2', imageUrl: 'https://example.com/banner2.png' },
      ];
      mockService.getAllActiveBanners.mockResolvedValue(banners);

      const result = await controller.getAllActiveBanners('hero' as any);

      expect(result).toEqual(banners);
      expect(mockService.getAllActiveBanners).toHaveBeenCalledWith('hero');
    });

    it('should return an empty array when no banners exist', async () => {
      mockService.getAllActiveBanners.mockResolvedValue([]);

      const result = await controller.getAllActiveBanners('sidebar' as any);

      expect(result).toEqual([]);
    });
  });

  describe('recordEngagement', () => {
    it('should record an engagement and return success', async () => {
      const dto = { bannerId: TEST_BANNER_ID, type: 'impression' as const };

      const result = await controller.recordEngagement(dto);

      expect(result).toEqual({ success: true });
      expect(mockService.recordEngagement).toHaveBeenCalledWith(TEST_BANNER_ID, 'impression');
    });

    it('should record a click engagement', async () => {
      const dto = { bannerId: TEST_BANNER_ID, type: 'click' as const };

      const result = await controller.recordEngagement(dto);

      expect(result).toEqual({ success: true });
      expect(mockService.recordEngagement).toHaveBeenCalledWith(TEST_BANNER_ID, 'click');
    });

    it('should return success even when recordEngagement throws', async () => {
      mockService.recordEngagement.mockRejectedValue(new Error('DB error'));
      const dto = { bannerId: TEST_BANNER_ID, type: 'impression' as const };

      const result = await controller.recordEngagement(dto);

      expect(result).toEqual({ success: true });
    });
  });

  // ====================================================================
  // AUTH / ADMIN BEHAVIOR
  // ====================================================================

  describe('requireAdmin behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.findAll(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.findAll('Basic some_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.findAll('Bearer invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(controller.findAll(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when profile is not found', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      });
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.findAll(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should succeed when user has admin role', async () => {
      mockAdminAuth();

      const result = await controller.findAll(ADMIN_AUTH_HEADER);

      expect(result).toEqual([]);
      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS
  // ====================================================================

  describe('findAll (admin)', () => {
    it('should return all banners for admin', async () => {
      mockAdminAuth();
      const banners = [{ id: '1', name: 'Banner A' }, { id: '2', name: 'Banner B' }];
      mockService.findAll.mockResolvedValue(banners);

      const result = await controller.findAll(ADMIN_AUTH_HEADER);

      expect(result).toEqual(banners);
      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllBannersAnalytics (admin)', () => {
    it('should return all banners analytics without date filters', async () => {
      mockAdminAuth();
      const analytics = [{ bannerId: '1', totalImpressions: 100 }];
      mockService.getAllBannersAnalytics.mockResolvedValue(analytics);

      const result = await controller.getAllBannersAnalytics(ADMIN_AUTH_HEADER);

      expect(result).toEqual(analytics);
      expect(mockService.getAllBannersAnalytics).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should pass date filters when provided', async () => {
      mockAdminAuth();
      mockService.getAllBannersAnalytics.mockResolvedValue([]);

      await controller.getAllBannersAnalytics(ADMIN_AUTH_HEADER, '2026-01-01', '2026-12-31');

      expect(mockService.getAllBannersAnalytics).toHaveBeenCalledWith(
        new Date('2026-01-01'),
        new Date('2026-12-31'),
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getAllBannersAnalytics(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne (admin)', () => {
    it('should return a single banner by ID', async () => {
      mockAdminAuth();
      const banner = { id: TEST_BANNER_ID, name: 'Test Banner' };
      mockService.findOne.mockResolvedValue(banner);

      const result = await controller.findOne(ADMIN_AUTH_HEADER, TEST_BANNER_ID);

      expect(result).toEqual(banner);
      expect(mockService.findOne).toHaveBeenCalledWith(TEST_BANNER_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.findOne(VALID_AUTH_HEADER, TEST_BANNER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getBannerAnalytics (admin)', () => {
    it('should return analytics for a specific banner', async () => {
      mockAdminAuth();
      const analytics = { bannerId: TEST_BANNER_ID, totalImpressions: 50 };
      mockService.getBannerAnalytics.mockResolvedValue(analytics);

      const result = await controller.getBannerAnalytics(ADMIN_AUTH_HEADER, TEST_BANNER_ID);

      expect(result).toEqual(analytics);
      expect(mockService.getBannerAnalytics).toHaveBeenCalledWith(TEST_BANNER_ID, undefined, undefined);
    });

    it('should pass date filters when provided', async () => {
      mockAdminAuth();
      mockService.getBannerAnalytics.mockResolvedValue({});

      await controller.getBannerAnalytics(ADMIN_AUTH_HEADER, TEST_BANNER_ID, '2026-01-01', '2026-06-30');

      expect(mockService.getBannerAnalytics).toHaveBeenCalledWith(
        TEST_BANNER_ID,
        new Date('2026-01-01'),
        new Date('2026-06-30'),
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getBannerAnalytics(VALID_AUTH_HEADER, TEST_BANNER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create (admin)', () => {
    it('should create a banner', async () => {
      mockAdminAuth();
      const dto = {
        name: 'New Banner',
        imageUrl: 'https://example.com/banner.png',
        position: 'hero',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        advertiserId: 'adv_123',
      } as any;
      const created = { id: TEST_BANNER_ID, name: 'New Banner' };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(ADMIN_AUTH_HEADER, dto);

      expect(result).toEqual(created);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.create(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('update (admin)', () => {
    it('should update a banner', async () => {
      mockAdminAuth();
      const dto = { name: 'Updated Banner' } as any;
      const updated = { id: TEST_BANNER_ID, name: 'Updated Banner' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(ADMIN_AUTH_HEADER, TEST_BANNER_ID, dto);

      expect(result).toEqual(updated);
      expect(mockService.update).toHaveBeenCalledWith(TEST_BANNER_ID, dto);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.update(VALID_AUTH_HEADER, TEST_BANNER_ID, {} as any),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });

  describe('delete (admin)', () => {
    it('should delete a banner', async () => {
      mockAdminAuth();

      await controller.delete(ADMIN_AUTH_HEADER, TEST_BANNER_ID);

      expect(mockService.delete).toHaveBeenCalledWith(TEST_BANNER_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.delete(VALID_AUTH_HEADER, TEST_BANNER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.delete).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from getActiveBanner', async () => {
      mockService.getActiveBanner.mockRejectedValue(new Error('DB error'));

      await expect(controller.getActiveBanner('hero' as any)).rejects.toThrow('DB error');
    });

    it('should propagate errors from findAll (admin)', async () => {
      mockAdminAuth();
      mockService.findAll.mockRejectedValue(new Error('Connection error'));

      await expect(controller.findAll(ADMIN_AUTH_HEADER)).rejects.toThrow('Connection error');
    });

    it('should propagate errors from create (admin)', async () => {
      mockAdminAuth();
      mockService.create.mockRejectedValue(new Error('Create failed'));

      await expect(controller.create(ADMIN_AUTH_HEADER, {} as any)).rejects.toThrow('Create failed');
    });

    it('should propagate errors from delete (admin)', async () => {
      mockAdminAuth();
      mockService.delete.mockRejectedValue(new Error('Not found'));

      await expect(controller.delete(ADMIN_AUTH_HEADER, 'nonexistent')).rejects.toThrow('Not found');
    });
  });
});

// =============================================================================
// AdvertisersController Tests
// =============================================================================

describe('AdvertisersController', () => {
  let controller: AdvertisersController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_USER_ID = 'user_123';
  const TEST_ADMIN_ID = 'admin_456';
  const TEST_ADVERTISER_ID = 'adv_789';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';

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
      findActive: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: TEST_ADVERTISER_ID, companyName: 'Test Advertiser' }),
      update: jest.fn().mockResolvedValue({ id: TEST_ADVERTISER_ID, companyName: 'Updated Advertiser' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvertisersController],
      providers: [
        { provide: AdvertisersService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<AdvertisersController>(AdvertisersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // AUTH / ADMIN BEHAVIOR
  // ====================================================================

  describe('requireAdmin behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.findAll(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.findAll('Basic some_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.findAll('Bearer invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(controller.findAll(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when profile is not found', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      });
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.findAll(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should succeed when user has admin role', async () => {
      mockAdminAuth();

      const result = await controller.findAll(ADMIN_AUTH_HEADER);

      expect(result).toEqual([]);
      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS
  // ====================================================================

  describe('findAll', () => {
    it('should return all advertisers for admin', async () => {
      mockAdminAuth();
      const advertisers = [
        { id: '1', companyName: 'Advertiser A' },
        { id: '2', companyName: 'Advertiser B' },
      ];
      mockService.findAll.mockResolvedValue(advertisers);

      const result = await controller.findAll(ADMIN_AUTH_HEADER);

      expect(result).toEqual(advertisers);
      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findActive', () => {
    it('should return active advertisers for admin', async () => {
      mockAdminAuth();
      const advertisers = [{ id: '1', companyName: 'Active Advertiser', isActive: true }];
      mockService.findActive.mockResolvedValue(advertisers);

      const result = await controller.findActive(ADMIN_AUTH_HEADER);

      expect(result).toEqual(advertisers);
      expect(mockService.findActive).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.findActive(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single advertiser by ID', async () => {
      mockAdminAuth();
      const advertiser = { id: TEST_ADVERTISER_ID, companyName: 'Test Advertiser' };
      mockService.findOne.mockResolvedValue(advertiser);

      const result = await controller.findOne(ADMIN_AUTH_HEADER, TEST_ADVERTISER_ID);

      expect(result).toEqual(advertiser);
      expect(mockService.findOne).toHaveBeenCalledWith(TEST_ADVERTISER_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.findOne(VALID_AUTH_HEADER, TEST_ADVERTISER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create an advertiser', async () => {
      mockAdminAuth();
      const dto = {
        companyName: 'New Advertiser',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
      } as any;
      const created = { id: TEST_ADVERTISER_ID, companyName: 'New Advertiser' };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(ADMIN_AUTH_HEADER, dto);

      expect(result).toEqual(created);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.create(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an advertiser', async () => {
      mockAdminAuth();
      const dto = { companyName: 'Updated Advertiser' } as any;
      const updated = { id: TEST_ADVERTISER_ID, companyName: 'Updated Advertiser' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(ADMIN_AUTH_HEADER, TEST_ADVERTISER_ID, dto);

      expect(result).toEqual(updated);
      expect(mockService.update).toHaveBeenCalledWith(TEST_ADVERTISER_ID, dto);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.update(VALID_AUTH_HEADER, TEST_ADVERTISER_ID, {} as any),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an advertiser', async () => {
      mockAdminAuth();

      await controller.delete(ADMIN_AUTH_HEADER, TEST_ADVERTISER_ID);

      expect(mockService.delete).toHaveBeenCalledWith(TEST_ADVERTISER_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.delete(VALID_AUTH_HEADER, TEST_ADVERTISER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.delete).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from findAll', async () => {
      mockAdminAuth();
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.findAll(ADMIN_AUTH_HEADER)).rejects.toThrow('DB error');
    });

    it('should propagate errors from create', async () => {
      mockAdminAuth();
      mockService.create.mockRejectedValue(new Error('Create failed'));

      await expect(controller.create(ADMIN_AUTH_HEADER, {} as any)).rejects.toThrow('Create failed');
    });

    it('should propagate errors from delete', async () => {
      mockAdminAuth();
      mockService.delete.mockRejectedValue(new Error('Not found'));

      await expect(controller.delete(ADMIN_AUTH_HEADER, 'nonexistent')).rejects.toThrow('Not found');
    });
  });
});
