import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { MemberGalleryController } from '../member-gallery.controller';
import { MemberGalleryService } from '../member-gallery.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('MemberGalleryController', () => {
  let controller: MemberGalleryController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_USER_ID = 'user_123';
  const TEST_ADMIN_ID = 'admin_456';
  const TEST_MEMBER_ID = 'member_789';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';

  function mockAuthSuccess(userId: string = TEST_USER_ID) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    (mockEm.findOne as jest.Mock).mockResolvedValue({ id: userId, role: UserRole.USER });
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

  function mockAuthFailure() {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
  }

  beforeEach(async () => {
    jest.clearAllMocks();

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
      getPublicGalleryByMemberId: jest.fn().mockResolvedValue([]),
      getGalleryByMemberId: jest.fn().mockResolvedValue([]),
      addImage: jest.fn().mockResolvedValue({}),
      updateImage: jest.fn().mockResolvedValue({}),
      deleteImage: jest.fn().mockResolvedValue(undefined),
      reorderImages: jest.fn().mockResolvedValue([]),
      adminDeleteImage: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemberGalleryController],
      providers: [
        { provide: MemberGalleryService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<MemberGalleryController>(MemberGalleryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ====================================================================
  // requireAuth behavior
  // ====================================================================
  describe('requireAuth behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.getMyGallery(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.getMyGallery('Basic some_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.getMyGallery('Bearer invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should extract token correctly and call getUser', async () => {
      mockAuthSuccess();

      await controller.getMyGallery(VALID_AUTH_HEADER);

      expect(mockGetUser).toHaveBeenCalledWith('valid_token_abc');
    });
  });

  // ====================================================================
  // requireAdmin behavior
  // ====================================================================
  describe('requireAdmin behavior', () => {
    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getAllGalleryImages(VALID_AUTH_HEADER, TEST_MEMBER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed when user has admin role', async () => {
      mockAdminAuth();
      mockService.getGalleryByMemberId.mockResolvedValue([]);

      const result = await controller.getAllGalleryImages(ADMIN_AUTH_HEADER, TEST_MEMBER_ID);

      expect(result).toEqual([]);
      expect(mockService.getGalleryByMemberId).toHaveBeenCalledWith(TEST_MEMBER_ID, true);
    });
  });

  // ====================================================================
  // PUBLIC ENDPOINTS
  // ====================================================================

  describe('getPublicGallery', () => {
    it('should return public gallery images for a member', async () => {
      const mockImages = [
        { id: 'img_1', imageUrl: 'https://example.com/photo1.jpg', isPublic: true },
        { id: 'img_2', imageUrl: 'https://example.com/photo2.jpg', isPublic: true },
      ];
      mockService.getPublicGalleryByMemberId.mockResolvedValue(mockImages);

      const result = await controller.getPublicGallery(TEST_MEMBER_ID);

      expect(mockService.getPublicGalleryByMemberId).toHaveBeenCalledWith(TEST_MEMBER_ID);
      expect(result).toEqual(mockImages);
    });

    it('should return an empty array when no public images exist', async () => {
      mockService.getPublicGalleryByMemberId.mockResolvedValue([]);

      const result = await controller.getPublicGallery(TEST_MEMBER_ID);

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockService.getPublicGalleryByMemberId.mockRejectedValue(new Error('DB error'));

      await expect(controller.getPublicGallery(TEST_MEMBER_ID)).rejects.toThrow('DB error');
    });
  });

  // ====================================================================
  // AUTHENTICATED USER ENDPOINTS (Own Gallery)
  // ====================================================================

  describe('getMyGallery', () => {
    it('should return the authenticated user gallery including private images', async () => {
      mockAuthSuccess();
      const mockImages = [
        { id: 'img_1', imageUrl: 'https://example.com/photo1.jpg', isPublic: true },
        { id: 'img_2', imageUrl: 'https://example.com/private.jpg', isPublic: false },
      ];
      mockService.getGalleryByMemberId.mockResolvedValue(mockImages);

      const result = await controller.getMyGallery(VALID_AUTH_HEADER);

      expect(mockService.getGalleryByMemberId).toHaveBeenCalledWith(TEST_USER_ID, true);
      expect(result).toEqual(mockImages);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getMyGallery(undefined as any)).rejects.toThrow(UnauthorizedException);
      expect(mockService.getGalleryByMemberId).not.toHaveBeenCalled();
    });
  });

  describe('addImage', () => {
    const createDto = {
      imageUrl: 'https://example.com/new-photo.jpg',
      caption: 'My new photo',
      sortOrder: 0,
      isPublic: true,
    };

    it('should add an image to the authenticated user gallery', async () => {
      mockAuthSuccess();
      const mockCreated = { id: 'img_new', ...createDto, member: TEST_USER_ID };
      mockService.addImage.mockResolvedValue(mockCreated);

      const result = await controller.addImage(VALID_AUTH_HEADER, createDto);

      expect(mockService.addImage).toHaveBeenCalledWith(TEST_USER_ID, createDto);
      expect(result).toEqual(mockCreated);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.addImage(undefined as any, createDto)).rejects.toThrow(UnauthorizedException);
      expect(mockService.addImage).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      mockAuthSuccess();
      mockService.addImage.mockRejectedValue(new Error('Upload failed'));

      await expect(controller.addImage(VALID_AUTH_HEADER, createDto)).rejects.toThrow('Upload failed');
    });
  });

  describe('updateImage', () => {
    const updateDto = {
      caption: 'Updated caption',
      isPublic: false,
    };

    it('should update an image in the authenticated user gallery', async () => {
      mockAuthSuccess();
      const mockUpdated = { id: 'img_1', caption: 'Updated caption', isPublic: false };
      mockService.updateImage.mockResolvedValue(mockUpdated);

      const result = await controller.updateImage(VALID_AUTH_HEADER, 'img_1', updateDto);

      expect(mockService.updateImage).toHaveBeenCalledWith('img_1', TEST_USER_ID, updateDto);
      expect(result).toEqual(mockUpdated);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.updateImage(undefined as any, 'img_1', updateDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.updateImage).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      mockAuthSuccess();
      mockService.updateImage.mockRejectedValue(
        new NotFoundException('Gallery image with ID img_99 not found'),
      );

      await expect(
        controller.updateImage(VALID_AUTH_HEADER, 'img_99', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service (not owner)', async () => {
      mockAuthSuccess();
      mockService.updateImage.mockRejectedValue(
        new ForbiddenException('You can only update your own gallery images'),
      );

      await expect(
        controller.updateImage(VALID_AUTH_HEADER, 'img_1', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteImage', () => {
    it('should delete an image from the authenticated user gallery', async () => {
      mockAuthSuccess();
      mockService.deleteImage.mockResolvedValue(undefined);

      await controller.deleteImage(VALID_AUTH_HEADER, 'img_1');

      expect(mockService.deleteImage).toHaveBeenCalledWith('img_1', TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.deleteImage(undefined as any, 'img_1'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.deleteImage).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      mockAuthSuccess();
      mockService.deleteImage.mockRejectedValue(
        new NotFoundException('Gallery image with ID img_99 not found'),
      );

      await expect(
        controller.deleteImage(VALID_AUTH_HEADER, 'img_99'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service (not owner)', async () => {
      mockAuthSuccess();
      mockService.deleteImage.mockRejectedValue(
        new ForbiddenException('You can only delete your own gallery images'),
      );

      await expect(
        controller.deleteImage(VALID_AUTH_HEADER, 'img_1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reorderImages', () => {
    const imageIds = ['img_3', 'img_1', 'img_2'];

    it('should reorder images in the authenticated user gallery', async () => {
      mockAuthSuccess();
      const mockReordered = [
        { id: 'img_3', sortOrder: 0 },
        { id: 'img_1', sortOrder: 1 },
        { id: 'img_2', sortOrder: 2 },
      ];
      mockService.reorderImages.mockResolvedValue(mockReordered);

      const result = await controller.reorderImages(VALID_AUTH_HEADER, imageIds);

      expect(mockService.reorderImages).toHaveBeenCalledWith(TEST_USER_ID, imageIds);
      expect(result).toEqual(mockReordered);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.reorderImages(undefined as any, imageIds),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.reorderImages).not.toHaveBeenCalled();
    });

    it('should propagate ForbiddenException from service (not owner)', async () => {
      mockAuthSuccess();
      mockService.reorderImages.mockRejectedValue(
        new ForbiddenException('You can only reorder your own gallery images'),
      );

      await expect(
        controller.reorderImages(VALID_AUTH_HEADER, imageIds),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS
  // ====================================================================

  describe('getAllGalleryImages', () => {
    it('should return all images including private for a member when admin', async () => {
      mockAdminAuth();
      const mockImages = [
        { id: 'img_1', imageUrl: 'https://example.com/photo1.jpg', isPublic: true },
        { id: 'img_2', imageUrl: 'https://example.com/private.jpg', isPublic: false },
      ];
      mockService.getGalleryByMemberId.mockResolvedValue(mockImages);

      const result = await controller.getAllGalleryImages(ADMIN_AUTH_HEADER, TEST_MEMBER_ID);

      expect(mockService.getGalleryByMemberId).toHaveBeenCalledWith(TEST_MEMBER_ID, true);
      expect(result).toEqual(mockImages);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getAllGalleryImages(VALID_AUTH_HEADER, TEST_MEMBER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.getGalleryByMemberId).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      await expect(
        controller.getAllGalleryImages(undefined as any, TEST_MEMBER_ID),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.getGalleryByMemberId).not.toHaveBeenCalled();
    });
  });

  describe('adminDeleteImage', () => {
    it('should delete any image as admin', async () => {
      mockAdminAuth();
      mockService.adminDeleteImage.mockResolvedValue(undefined);

      await controller.adminDeleteImage(ADMIN_AUTH_HEADER, 'img_1');

      expect(mockService.adminDeleteImage).toHaveBeenCalledWith('img_1');
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminDeleteImage(VALID_AUTH_HEADER, 'img_1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.adminDeleteImage).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      await expect(
        controller.adminDeleteImage(undefined as any, 'img_1'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.adminDeleteImage).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      mockAdminAuth();
      mockService.adminDeleteImage.mockRejectedValue(
        new NotFoundException('Gallery image with ID img_99 not found'),
      );

      await expect(
        controller.adminDeleteImage(ADMIN_AUTH_HEADER, 'img_99'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================
  describe('service error propagation', () => {
    it('should propagate service errors from getPublicGallery', async () => {
      mockService.getPublicGalleryByMemberId.mockRejectedValue(new Error('DB error'));

      await expect(controller.getPublicGallery(TEST_MEMBER_ID)).rejects.toThrow('DB error');
    });

    it('should propagate service errors from addImage', async () => {
      mockAuthSuccess();
      mockService.addImage.mockRejectedValue(new Error('Storage error'));

      await expect(
        controller.addImage(VALID_AUTH_HEADER, { imageUrl: 'https://example.com/photo.jpg' }),
      ).rejects.toThrow('Storage error');
    });

    it('should propagate service errors from adminDeleteImage', async () => {
      mockAdminAuth();
      mockService.adminDeleteImage.mockRejectedValue(new Error('Delete error'));

      await expect(
        controller.adminDeleteImage(ADMIN_AUTH_HEADER, 'img_1'),
      ).rejects.toThrow('Delete error');
    });
  });
});
