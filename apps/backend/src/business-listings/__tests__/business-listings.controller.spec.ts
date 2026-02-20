import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BusinessListingsController } from '../business-listings.controller';
import { BusinessListingsService } from '../business-listings.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('BusinessListingsController', () => {
  let controller: BusinessListingsController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_USER_ID = 'user_123';
  const TEST_ADMIN_ID = 'admin_456';
  const TEST_RETAILER_ID = 'retailer_789';
  const TEST_MANUFACTURER_ID = 'manufacturer_abc';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';

  // Helper to configure Supabase mock for successful auth
  function mockAuthSuccess(userId: string = TEST_USER_ID) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  }

  // Helper to configure Supabase mock for auth failure
  function mockAuthFailure() {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
  }

  // Helper to configure admin auth (Supabase success + profile with admin role)
  function mockAdminAuth(userId: string = TEST_ADMIN_ID) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    (mockEm.findOne as jest.Mock).mockResolvedValue({ id: userId, role: UserRole.ADMIN });
  }

  // Helper to configure user auth that fails admin check
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
      findAllRetailers: jest.fn().mockResolvedValue([]),
      findRetailerById: jest.fn().mockResolvedValue(null),
      findRetailerByUserId: jest.fn().mockResolvedValue(null),
      createRetailer: jest.fn().mockResolvedValue({ id: TEST_RETAILER_ID, businessName: 'Test Shop' }),
      updateRetailer: jest.fn().mockResolvedValue({ id: TEST_RETAILER_ID, businessName: 'Updated Shop' }),
      deleteRetailer: jest.fn().mockResolvedValue(undefined),
      approveRetailer: jest.fn().mockResolvedValue({ id: TEST_RETAILER_ID, isApproved: true }),
      adminCreateRetailer: jest.fn().mockResolvedValue({ id: TEST_RETAILER_ID, businessName: 'Admin Created' }),
      getRetailerSponsors: jest.fn().mockResolvedValue([]),
      findAllManufacturers: jest.fn().mockResolvedValue([]),
      findManufacturerById: jest.fn().mockResolvedValue(null),
      findManufacturerByUserId: jest.fn().mockResolvedValue(null),
      createManufacturer: jest.fn().mockResolvedValue({ id: TEST_MANUFACTURER_ID, businessName: 'Test Mfg' }),
      updateManufacturer: jest.fn().mockResolvedValue({ id: TEST_MANUFACTURER_ID, businessName: 'Updated Mfg' }),
      deleteManufacturer: jest.fn().mockResolvedValue(undefined),
      approveManufacturer: jest.fn().mockResolvedValue({ id: TEST_MANUFACTURER_ID, isApproved: true }),
      adminCreateManufacturer: jest.fn().mockResolvedValue({ id: TEST_MANUFACTURER_ID, businessName: 'Admin Mfg' }),
      getManufacturerSponsors: jest.fn().mockResolvedValue([]),
      getAllSponsors: jest.fn().mockResolvedValue({ retailers: [], manufacturers: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessListingsController],
      providers: [
        { provide: BusinessListingsService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<BusinessListingsController>(BusinessListingsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // AUTH HELPERS (requireAuth / requireAdmin) - tested through endpoints
  // ====================================================================

  describe('requireAuth behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.getMyRetailerListing(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.getMyRetailerListing('Basic some_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.getMyRetailerListing('Bearer invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should extract token correctly and call getUser', async () => {
      mockAuthSuccess();

      await controller.getMyRetailerListing(VALID_AUTH_HEADER);

      expect(mockGetUser).toHaveBeenCalledWith('valid_token_abc');
    });
  });

  describe('requireAdmin behavior', () => {
    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(controller.adminGetAllRetailers(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when profile is not found', async () => {
      mockAuthSuccess();
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      await expect(controller.adminGetAllRetailers(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should succeed when user has admin role', async () => {
      mockAdminAuth();

      const result = await controller.adminGetAllRetailers(ADMIN_AUTH_HEADER);

      expect(result).toEqual([]);
      expect(mockService.findAllRetailers).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException before ForbiddenException when no token', async () => {
      await expect(controller.adminGetAllRetailers(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ====================================================================
  // PUBLIC ENDPOINTS (no auth required)
  // ====================================================================

  describe('getAllRetailers', () => {
    it('should return all active/approved retailers', async () => {
      const retailers = [
        { id: '1', businessName: 'Shop A' },
        { id: '2', businessName: 'Shop B' },
      ];
      mockService.findAllRetailers.mockResolvedValue(retailers);

      const result = await controller.getAllRetailers();

      expect(result).toEqual(retailers);
      expect(mockService.findAllRetailers).toHaveBeenCalledWith(false);
    });

    it('should return an empty array when no retailers exist', async () => {
      mockService.findAllRetailers.mockResolvedValue([]);

      const result = await controller.getAllRetailers();

      expect(result).toEqual([]);
    });
  });

  describe('getRetailerById', () => {
    it('should return a retailer by ID', async () => {
      const retailer = { id: TEST_RETAILER_ID, businessName: 'Test Shop' };
      mockService.findRetailerById.mockResolvedValue(retailer);

      const result = await controller.getRetailerById(TEST_RETAILER_ID);

      expect(result).toEqual(retailer);
      expect(mockService.findRetailerById).toHaveBeenCalledWith(TEST_RETAILER_ID);
    });

    it('should return null when retailer is not found', async () => {
      mockService.findRetailerById.mockResolvedValue(null);

      const result = await controller.getRetailerById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllManufacturers', () => {
    it('should return all active/approved manufacturers', async () => {
      const manufacturers = [
        { id: '1', businessName: 'Manufacturer A' },
        { id: '2', businessName: 'Manufacturer B' },
      ];
      mockService.findAllManufacturers.mockResolvedValue(manufacturers);

      const result = await controller.getAllManufacturers();

      expect(result).toEqual(manufacturers);
      expect(mockService.findAllManufacturers).toHaveBeenCalledWith(false);
    });

    it('should return an empty array when no manufacturers exist', async () => {
      mockService.findAllManufacturers.mockResolvedValue([]);

      const result = await controller.getAllManufacturers();

      expect(result).toEqual([]);
    });
  });

  describe('getManufacturerById', () => {
    it('should return a manufacturer by ID', async () => {
      const manufacturer = { id: TEST_MANUFACTURER_ID, businessName: 'Test Mfg' };
      mockService.findManufacturerById.mockResolvedValue(manufacturer);

      const result = await controller.getManufacturerById(TEST_MANUFACTURER_ID);

      expect(result).toEqual(manufacturer);
      expect(mockService.findManufacturerById).toHaveBeenCalledWith(TEST_MANUFACTURER_ID);
    });

    it('should return null when manufacturer is not found', async () => {
      mockService.findManufacturerById.mockResolvedValue(null);

      const result = await controller.getManufacturerById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAllSponsors', () => {
    it('should return combined sponsors from retailers and manufacturers', async () => {
      const sponsors = {
        retailers: [{ id: '1', businessName: 'Sponsor Retailer', isSponsor: true }],
        manufacturers: [{ id: '2', businessName: 'Sponsor Mfg', isSponsor: true }],
      };
      mockService.getAllSponsors.mockResolvedValue(sponsors);

      const result = await controller.getAllSponsors();

      expect(result).toEqual(sponsors);
      expect(mockService.getAllSponsors).toHaveBeenCalledTimes(1);
    });

    it('should return empty arrays when no sponsors exist', async () => {
      mockService.getAllSponsors.mockResolvedValue({ retailers: [], manufacturers: [] });

      const result = await controller.getAllSponsors();

      expect(result).toEqual({ retailers: [], manufacturers: [] });
    });
  });

  // ====================================================================
  // USER ENDPOINTS - RETAILERS (Requires Auth)
  // ====================================================================

  describe('getMyRetailerListing', () => {
    it('should return the retailer listing for the authenticated user', async () => {
      mockAuthSuccess();
      const listing = { id: TEST_RETAILER_ID, businessName: 'My Shop' };
      mockService.findRetailerByUserId.mockResolvedValue(listing);

      const result = await controller.getMyRetailerListing(VALID_AUTH_HEADER);

      expect(result).toEqual(listing);
      expect(mockService.findRetailerByUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return null when user has no retailer listing', async () => {
      mockAuthSuccess();
      mockService.findRetailerByUserId.mockResolvedValue(null);

      const result = await controller.getMyRetailerListing(VALID_AUTH_HEADER);

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getMyRetailerListing(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockService.findRetailerByUserId).not.toHaveBeenCalled();
    });
  });

  describe('createMyRetailerListing', () => {
    const createDto = {
      business_name: 'New Retailer',
      description: 'A great shop',
      offer_text: '10% off for MECA members',
      business_email: 'shop@example.com',
      business_phone: '555-1234',
      website: 'https://shop.example.com',
      store_type: 'both',
      street_address: '123 Main St',
      city: 'Austin',
      state: 'TX',
      postal_code: '78701',
      country: 'USA',
      profile_image_url: 'https://img.example.com/logo.png',
      gallery_images: [{ url: 'https://img.example.com/gallery1.png', caption: 'Photo 1' }],
    };

    it('should create a retailer listing with snake_case DTO transformed to camelCase', async () => {
      mockAuthSuccess();
      const createdListing = { id: TEST_RETAILER_ID, businessName: 'New Retailer' };
      mockService.createRetailer.mockResolvedValue(createdListing);

      const result = await controller.createMyRetailerListing(VALID_AUTH_HEADER, createDto);

      expect(result).toEqual(createdListing);
      expect(mockService.createRetailer).toHaveBeenCalledWith(TEST_USER_ID, {
        businessName: 'New Retailer',
        description: 'A great shop',
        offerText: '10% off for MECA members',
        businessEmail: 'shop@example.com',
        businessPhone: '555-1234',
        website: 'https://shop.example.com',
        storeType: 'both',
        streetAddress: '123 Main St',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'USA',
        profileImageUrl: 'https://img.example.com/logo.png',
        galleryImages: [{ url: 'https://img.example.com/gallery1.png', caption: 'Photo 1' }],
      });
    });

    it('should handle minimal DTO with only required fields', async () => {
      mockAuthSuccess();
      const minimalDto = { business_name: 'Minimal Shop' };
      mockService.createRetailer.mockResolvedValue({ id: TEST_RETAILER_ID, businessName: 'Minimal Shop' });

      await controller.createMyRetailerListing(VALID_AUTH_HEADER, minimalDto);

      expect(mockService.createRetailer).toHaveBeenCalledWith(TEST_USER_ID, {
        businessName: 'Minimal Shop',
        description: undefined,
        offerText: undefined,
        businessEmail: undefined,
        businessPhone: undefined,
        website: undefined,
        storeType: undefined,
        streetAddress: undefined,
        city: undefined,
        state: undefined,
        postalCode: undefined,
        country: undefined,
        profileImageUrl: undefined,
        galleryImages: undefined,
      });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.createMyRetailerListing(undefined as any, createDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.createRetailer).not.toHaveBeenCalled();
    });
  });

  describe('updateMyRetailerListing', () => {
    const updateDto = {
      business_name: 'Updated Shop',
      description: 'Updated description',
      offer_text: '15% off',
      business_email: 'updated@example.com',
      business_phone: '555-5678',
      website: 'https://updated.example.com',
      store_type: 'online',
      street_address: '456 Oak Ave',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75201',
      country: 'USA',
      profile_image_url: 'https://img.example.com/new-logo.png',
      gallery_images: [{ url: 'https://img.example.com/new-gallery.png' }],
      cover_image_position: { x: 50, y: 30 },
    };

    it('should find the user listing and update it', async () => {
      mockAuthSuccess();
      const existingListing = { id: TEST_RETAILER_ID, businessName: 'Old Shop' };
      mockService.findRetailerByUserId.mockResolvedValue(existingListing);
      const updatedListing = { id: TEST_RETAILER_ID, businessName: 'Updated Shop' };
      mockService.updateRetailer.mockResolvedValue(updatedListing);

      const result = await controller.updateMyRetailerListing(VALID_AUTH_HEADER, updateDto);

      expect(result).toEqual(updatedListing);
      expect(mockService.findRetailerByUserId).toHaveBeenCalledWith(TEST_USER_ID);
      expect(mockService.updateRetailer).toHaveBeenCalledWith(
        TEST_RETAILER_ID,
        {
          businessName: 'Updated Shop',
          description: 'Updated description',
          offerText: '15% off',
          businessEmail: 'updated@example.com',
          businessPhone: '555-5678',
          website: 'https://updated.example.com',
          storeType: 'online',
          streetAddress: '456 Oak Ave',
          city: 'Dallas',
          state: 'TX',
          postalCode: '75201',
          country: 'USA',
          profileImageUrl: 'https://img.example.com/new-logo.png',
          galleryImages: [{ url: 'https://img.example.com/new-gallery.png' }],
          coverImagePosition: { x: 50, y: 30 },
        },
        TEST_USER_ID,
        false,
      );
    });

    it('should throw UnauthorizedException when user has no retailer listing', async () => {
      mockAuthSuccess();
      mockService.findRetailerByUserId.mockResolvedValue(null);

      await expect(
        controller.updateMyRetailerListing(VALID_AUTH_HEADER, updateDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.updateRetailer).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.updateMyRetailerListing(undefined as any, updateDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.findRetailerByUserId).not.toHaveBeenCalled();
      expect(mockService.updateRetailer).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // USER ENDPOINTS - MANUFACTURERS (Requires Auth)
  // ====================================================================

  describe('getMyManufacturerListing', () => {
    it('should return the manufacturer listing for the authenticated user', async () => {
      mockAuthSuccess();
      const listing = { id: TEST_MANUFACTURER_ID, businessName: 'My Mfg' };
      mockService.findManufacturerByUserId.mockResolvedValue(listing);

      const result = await controller.getMyManufacturerListing(VALID_AUTH_HEADER);

      expect(result).toEqual(listing);
      expect(mockService.findManufacturerByUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return null when user has no manufacturer listing', async () => {
      mockAuthSuccess();
      mockService.findManufacturerByUserId.mockResolvedValue(null);

      const result = await controller.getMyManufacturerListing(VALID_AUTH_HEADER);

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getMyManufacturerListing(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockService.findManufacturerByUserId).not.toHaveBeenCalled();
    });
  });

  describe('createMyManufacturerListing', () => {
    const createDto = {
      business_name: 'New Manufacturer',
      description: 'Great products',
      business_email: 'mfg@example.com',
      business_phone: '555-9999',
      website: 'https://mfg.example.com',
      product_categories: ['amplifiers', 'speakers'],
      street_address: '789 Industry Blvd',
      city: 'Houston',
      state: 'TX',
      postal_code: '77001',
      country: 'USA',
      profile_image_url: 'https://img.example.com/mfg-logo.png',
      gallery_images: [{ url: 'https://img.example.com/product1.png' }],
    };

    it('should create a manufacturer listing with snake_case DTO transformed to camelCase', async () => {
      mockAuthSuccess();
      const createdListing = { id: TEST_MANUFACTURER_ID, businessName: 'New Manufacturer' };
      mockService.createManufacturer.mockResolvedValue(createdListing);

      const result = await controller.createMyManufacturerListing(VALID_AUTH_HEADER, createDto);

      expect(result).toEqual(createdListing);
      expect(mockService.createManufacturer).toHaveBeenCalledWith(TEST_USER_ID, {
        businessName: 'New Manufacturer',
        description: 'Great products',
        businessEmail: 'mfg@example.com',
        businessPhone: '555-9999',
        website: 'https://mfg.example.com',
        productCategories: ['amplifiers', 'speakers'],
        streetAddress: '789 Industry Blvd',
        city: 'Houston',
        state: 'TX',
        postalCode: '77001',
        country: 'USA',
        profileImageUrl: 'https://img.example.com/mfg-logo.png',
        galleryImages: [{ url: 'https://img.example.com/product1.png' }],
      });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.createMyManufacturerListing(undefined as any, createDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.createManufacturer).not.toHaveBeenCalled();
    });
  });

  describe('updateMyManufacturerListing', () => {
    const updateDto = {
      business_name: 'Updated Mfg',
      description: 'Updated products',
      business_email: 'updated-mfg@example.com',
      business_phone: '555-0000',
      website: 'https://updated-mfg.example.com',
      product_categories: ['subwoofers'],
      street_address: '321 Factory Rd',
      city: 'San Antonio',
      state: 'TX',
      postal_code: '78201',
      country: 'USA',
      profile_image_url: 'https://img.example.com/updated-mfg-logo.png',
      gallery_images: [{ url: 'https://img.example.com/updated-product.png' }],
      cover_image_position: { x: 25, y: 75 },
    };

    it('should find the user listing and update it', async () => {
      mockAuthSuccess();
      const existingListing = { id: TEST_MANUFACTURER_ID, businessName: 'Old Mfg' };
      mockService.findManufacturerByUserId.mockResolvedValue(existingListing);
      const updatedListing = { id: TEST_MANUFACTURER_ID, businessName: 'Updated Mfg' };
      mockService.updateManufacturer.mockResolvedValue(updatedListing);

      const result = await controller.updateMyManufacturerListing(VALID_AUTH_HEADER, updateDto);

      expect(result).toEqual(updatedListing);
      expect(mockService.findManufacturerByUserId).toHaveBeenCalledWith(TEST_USER_ID);
      expect(mockService.updateManufacturer).toHaveBeenCalledWith(
        TEST_MANUFACTURER_ID,
        {
          businessName: 'Updated Mfg',
          description: 'Updated products',
          businessEmail: 'updated-mfg@example.com',
          businessPhone: '555-0000',
          website: 'https://updated-mfg.example.com',
          productCategories: ['subwoofers'],
          streetAddress: '321 Factory Rd',
          city: 'San Antonio',
          state: 'TX',
          postalCode: '78201',
          country: 'USA',
          profileImageUrl: 'https://img.example.com/updated-mfg-logo.png',
          galleryImages: [{ url: 'https://img.example.com/updated-product.png' }],
          coverImagePosition: { x: 25, y: 75 },
        },
        TEST_USER_ID,
        false,
      );
    });

    it('should throw UnauthorizedException when user has no manufacturer listing', async () => {
      mockAuthSuccess();
      mockService.findManufacturerByUserId.mockResolvedValue(null);

      await expect(
        controller.updateMyManufacturerListing(VALID_AUTH_HEADER, updateDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.updateManufacturer).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.updateMyManufacturerListing(undefined as any, updateDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.findManufacturerByUserId).not.toHaveBeenCalled();
      expect(mockService.updateManufacturer).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS - RETAILERS
  // ====================================================================

  describe('adminGetRetailerByUserId', () => {
    it('should return retailer listing for the specified user ID', async () => {
      mockAdminAuth();
      const listing = { id: TEST_RETAILER_ID, businessName: 'User Shop' };
      mockService.findRetailerByUserId.mockResolvedValue(listing);

      const result = await controller.adminGetRetailerByUserId(ADMIN_AUTH_HEADER, TEST_USER_ID);

      expect(result).toEqual(listing);
      expect(mockService.findRetailerByUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminGetRetailerByUserId(VALID_AUTH_HEADER, TEST_USER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.findRetailerByUserId).not.toHaveBeenCalled();
    });
  });

  describe('adminGetManufacturerByUserId', () => {
    it('should return manufacturer listing for the specified user ID', async () => {
      mockAdminAuth();
      const listing = { id: TEST_MANUFACTURER_ID, businessName: 'User Mfg' };
      mockService.findManufacturerByUserId.mockResolvedValue(listing);

      const result = await controller.adminGetManufacturerByUserId(ADMIN_AUTH_HEADER, TEST_USER_ID);

      expect(result).toEqual(listing);
      expect(mockService.findManufacturerByUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminGetManufacturerByUserId(VALID_AUTH_HEADER, TEST_USER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.findManufacturerByUserId).not.toHaveBeenCalled();
    });
  });

  describe('adminGetAllRetailers', () => {
    it('should return all retailers including inactive when includeInactive is true', async () => {
      mockAdminAuth();
      const retailers = [
        { id: '1', businessName: 'Active Shop', isActive: true },
        { id: '2', businessName: 'Inactive Shop', isActive: false },
      ];
      mockService.findAllRetailers.mockResolvedValue(retailers);

      const result = await controller.adminGetAllRetailers(ADMIN_AUTH_HEADER, 'true');

      expect(result).toEqual(retailers);
      expect(mockService.findAllRetailers).toHaveBeenCalledWith(true);
    });

    it('should return only active retailers when includeInactive is not true', async () => {
      mockAdminAuth();
      mockService.findAllRetailers.mockResolvedValue([]);

      await controller.adminGetAllRetailers(ADMIN_AUTH_HEADER, 'false');

      expect(mockService.findAllRetailers).toHaveBeenCalledWith(false);
    });

    it('should return only active retailers when includeInactive is undefined', async () => {
      mockAdminAuth();
      mockService.findAllRetailers.mockResolvedValue([]);

      await controller.adminGetAllRetailers(ADMIN_AUTH_HEADER);

      expect(mockService.findAllRetailers).toHaveBeenCalledWith(false);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.adminGetAllRetailers(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockService.findAllRetailers).not.toHaveBeenCalled();
    });
  });

  describe('adminCreateRetailer', () => {
    const adminCreateDto = {
      user_id: TEST_USER_ID,
      business_name: 'Admin Created Shop',
      description: 'Created by admin',
      offer_text: '20% off',
      business_email: 'admin-shop@example.com',
      business_phone: '555-ADMIN',
      website: 'https://admin-shop.example.com',
      store_type: 'brick_and_mortar',
      street_address: '100 Admin St',
      city: 'Austin',
      state: 'TX',
      postal_code: '78702',
      country: 'USA',
      profile_image_url: 'https://img.example.com/admin-logo.png',
      gallery_images: [{ url: 'https://img.example.com/admin-gallery.png' }] as any[],
      is_approved: true,
    };

    it('should create a retailer listing with snake_case DTO transformed to camelCase', async () => {
      mockAdminAuth();
      const createdListing = { id: TEST_RETAILER_ID, businessName: 'Admin Created Shop' };
      mockService.adminCreateRetailer.mockResolvedValue(createdListing);

      const result = await controller.adminCreateRetailer(ADMIN_AUTH_HEADER, adminCreateDto);

      expect(result).toEqual(createdListing);
      expect(mockService.adminCreateRetailer).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        businessName: 'Admin Created Shop',
        description: 'Created by admin',
        offerText: '20% off',
        businessEmail: 'admin-shop@example.com',
        businessPhone: '555-ADMIN',
        website: 'https://admin-shop.example.com',
        storeType: 'brick_and_mortar',
        streetAddress: '100 Admin St',
        city: 'Austin',
        state: 'TX',
        postalCode: '78702',
        country: 'USA',
        profileImageUrl: 'https://img.example.com/admin-logo.png',
        galleryImages: [{ url: 'https://img.example.com/admin-gallery.png' }],
        isApproved: true,
      });
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminCreateRetailer(VALID_AUTH_HEADER, adminCreateDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.adminCreateRetailer).not.toHaveBeenCalled();
    });
  });

  describe('adminUpdateRetailer', () => {
    const adminUpdateDto = {
      business_name: 'Admin Updated Shop',
      description: 'Admin updated',
      offer_text: '25% off',
      business_email: 'admin-updated@example.com',
      business_phone: '555-UPDATE',
      website: 'https://admin-updated.example.com',
      store_type: 'online',
      street_address: '200 Admin Ave',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75202',
      country: 'USA',
      profile_image_url: 'https://img.example.com/admin-updated-logo.png',
      gallery_images: [{ url: 'https://img.example.com/admin-updated-gallery.png' }],
      cover_image_position: { x: 10, y: 90 },
      is_sponsor: true,
      sponsor_order: 1,
      is_active: true,
      is_approved: true,
      user_id: 'new_user_id',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    };

    it('should update retailer with admin-only fields (isAdmin=true)', async () => {
      mockAdminAuth();
      const updatedListing = { id: TEST_RETAILER_ID, businessName: 'Admin Updated Shop' };
      mockService.updateRetailer.mockResolvedValue(updatedListing);

      const result = await controller.adminUpdateRetailer(
        ADMIN_AUTH_HEADER,
        TEST_RETAILER_ID,
        adminUpdateDto,
      );

      expect(result).toEqual(updatedListing);
      expect(mockService.updateRetailer).toHaveBeenCalledWith(
        TEST_RETAILER_ID,
        {
          businessName: 'Admin Updated Shop',
          description: 'Admin updated',
          offerText: '25% off',
          businessEmail: 'admin-updated@example.com',
          businessPhone: '555-UPDATE',
          website: 'https://admin-updated.example.com',
          storeType: 'online',
          streetAddress: '200 Admin Ave',
          city: 'Dallas',
          state: 'TX',
          postalCode: '75202',
          country: 'USA',
          profileImageUrl: 'https://img.example.com/admin-updated-logo.png',
          galleryImages: [{ url: 'https://img.example.com/admin-updated-gallery.png' }],
          coverImagePosition: { x: 10, y: 90 },
          isSponsor: true,
          sponsorOrder: 1,
          isActive: true,
          isApproved: true,
          userId: 'new_user_id',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
        TEST_ADMIN_ID,
        true,
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminUpdateRetailer(VALID_AUTH_HEADER, TEST_RETAILER_ID, adminUpdateDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.updateRetailer).not.toHaveBeenCalled();
    });
  });

  describe('approveRetailer', () => {
    it('should approve a retailer listing', async () => {
      mockAdminAuth();
      const approvedListing = { id: TEST_RETAILER_ID, isApproved: true };
      mockService.approveRetailer.mockResolvedValue(approvedListing);

      const result = await controller.approveRetailer(ADMIN_AUTH_HEADER, TEST_RETAILER_ID);

      expect(result).toEqual(approvedListing);
      expect(mockService.approveRetailer).toHaveBeenCalledWith(TEST_RETAILER_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.approveRetailer(VALID_AUTH_HEADER, TEST_RETAILER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.approveRetailer).not.toHaveBeenCalled();
    });
  });

  describe('adminDeleteRetailer', () => {
    it('should delete a retailer listing as admin', async () => {
      mockAdminAuth();

      await controller.adminDeleteRetailer(ADMIN_AUTH_HEADER, TEST_RETAILER_ID);

      expect(mockService.deleteRetailer).toHaveBeenCalledWith(
        TEST_RETAILER_ID,
        TEST_ADMIN_ID,
        true,
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminDeleteRetailer(VALID_AUTH_HEADER, TEST_RETAILER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.deleteRetailer).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS - MANUFACTURERS
  // ====================================================================

  describe('adminGetAllManufacturers', () => {
    it('should return all manufacturers including inactive when includeInactive is true', async () => {
      mockAdminAuth();
      const manufacturers = [
        { id: '1', businessName: 'Active Mfg', isActive: true },
        { id: '2', businessName: 'Inactive Mfg', isActive: false },
      ];
      mockService.findAllManufacturers.mockResolvedValue(manufacturers);

      const result = await controller.adminGetAllManufacturers(ADMIN_AUTH_HEADER, 'true');

      expect(result).toEqual(manufacturers);
      expect(mockService.findAllManufacturers).toHaveBeenCalledWith(true);
    });

    it('should return only active manufacturers when includeInactive is not true', async () => {
      mockAdminAuth();
      mockService.findAllManufacturers.mockResolvedValue([]);

      await controller.adminGetAllManufacturers(ADMIN_AUTH_HEADER, 'false');

      expect(mockService.findAllManufacturers).toHaveBeenCalledWith(false);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminGetAllManufacturers(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.findAllManufacturers).not.toHaveBeenCalled();
    });
  });

  describe('adminCreateManufacturer', () => {
    const adminCreateDto = {
      user_id: TEST_USER_ID,
      business_name: 'Admin Created Mfg',
      description: 'Created by admin',
      business_email: 'admin-mfg@example.com',
      business_phone: '555-MFG',
      website: 'https://admin-mfg.example.com',
      product_categories: ['head units', 'processors'],
      street_address: '500 Factory Way',
      city: 'Houston',
      state: 'TX',
      postal_code: '77002',
      country: 'USA',
      profile_image_url: 'https://img.example.com/admin-mfg-logo.png',
      gallery_images: [{ url: 'https://img.example.com/admin-mfg-gallery.png' }] as any[],
      is_approved: true,
    };

    it('should create a manufacturer listing with snake_case DTO transformed to camelCase', async () => {
      mockAdminAuth();
      const createdListing = { id: TEST_MANUFACTURER_ID, businessName: 'Admin Created Mfg' };
      mockService.adminCreateManufacturer.mockResolvedValue(createdListing);

      const result = await controller.adminCreateManufacturer(ADMIN_AUTH_HEADER, adminCreateDto);

      expect(result).toEqual(createdListing);
      expect(mockService.adminCreateManufacturer).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        businessName: 'Admin Created Mfg',
        description: 'Created by admin',
        businessEmail: 'admin-mfg@example.com',
        businessPhone: '555-MFG',
        website: 'https://admin-mfg.example.com',
        productCategories: ['head units', 'processors'],
        streetAddress: '500 Factory Way',
        city: 'Houston',
        state: 'TX',
        postalCode: '77002',
        country: 'USA',
        profileImageUrl: 'https://img.example.com/admin-mfg-logo.png',
        galleryImages: [{ url: 'https://img.example.com/admin-mfg-gallery.png' }],
        isApproved: true,
      });
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminCreateManufacturer(VALID_AUTH_HEADER, adminCreateDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.adminCreateManufacturer).not.toHaveBeenCalled();
    });
  });

  describe('adminUpdateManufacturer', () => {
    const adminUpdateDto = {
      business_name: 'Admin Updated Mfg',
      description: 'Admin updated manufacturer',
      business_email: 'admin-updated-mfg@example.com',
      business_phone: '555-UMFG',
      website: 'https://admin-updated-mfg.example.com',
      product_categories: ['tweeters'],
      street_address: '600 Updated Way',
      city: 'San Antonio',
      state: 'TX',
      postal_code: '78202',
      country: 'USA',
      profile_image_url: 'https://img.example.com/admin-updated-mfg-logo.png',
      gallery_images: [{ url: 'https://img.example.com/admin-updated-mfg-gallery.png' }],
      cover_image_position: { x: 60, y: 40 },
      is_sponsor: true,
      sponsor_order: 2,
      is_active: true,
      is_approved: true,
      user_id: 'reassigned_user_id',
      start_date: '2026-03-01',
      end_date: '2027-02-28',
    };

    it('should update manufacturer with admin-only fields (isAdmin=true)', async () => {
      mockAdminAuth();
      const updatedListing = { id: TEST_MANUFACTURER_ID, businessName: 'Admin Updated Mfg' };
      mockService.updateManufacturer.mockResolvedValue(updatedListing);

      const result = await controller.adminUpdateManufacturer(
        ADMIN_AUTH_HEADER,
        TEST_MANUFACTURER_ID,
        adminUpdateDto,
      );

      expect(result).toEqual(updatedListing);
      expect(mockService.updateManufacturer).toHaveBeenCalledWith(
        TEST_MANUFACTURER_ID,
        {
          businessName: 'Admin Updated Mfg',
          description: 'Admin updated manufacturer',
          businessEmail: 'admin-updated-mfg@example.com',
          businessPhone: '555-UMFG',
          website: 'https://admin-updated-mfg.example.com',
          productCategories: ['tweeters'],
          streetAddress: '600 Updated Way',
          city: 'San Antonio',
          state: 'TX',
          postalCode: '78202',
          country: 'USA',
          profileImageUrl: 'https://img.example.com/admin-updated-mfg-logo.png',
          galleryImages: [{ url: 'https://img.example.com/admin-updated-mfg-gallery.png' }],
          coverImagePosition: { x: 60, y: 40 },
          isSponsor: true,
          sponsorOrder: 2,
          isActive: true,
          isApproved: true,
          userId: 'reassigned_user_id',
          startDate: '2026-03-01',
          endDate: '2027-02-28',
        },
        TEST_ADMIN_ID,
        true,
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminUpdateManufacturer(VALID_AUTH_HEADER, TEST_MANUFACTURER_ID, adminUpdateDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.updateManufacturer).not.toHaveBeenCalled();
    });
  });

  describe('approveManufacturer', () => {
    it('should approve a manufacturer listing', async () => {
      mockAdminAuth();
      const approvedListing = { id: TEST_MANUFACTURER_ID, isApproved: true };
      mockService.approveManufacturer.mockResolvedValue(approvedListing);

      const result = await controller.approveManufacturer(ADMIN_AUTH_HEADER, TEST_MANUFACTURER_ID);

      expect(result).toEqual(approvedListing);
      expect(mockService.approveManufacturer).toHaveBeenCalledWith(TEST_MANUFACTURER_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.approveManufacturer(VALID_AUTH_HEADER, TEST_MANUFACTURER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.approveManufacturer).not.toHaveBeenCalled();
    });
  });

  describe('adminDeleteManufacturer', () => {
    it('should delete a manufacturer listing as admin', async () => {
      mockAdminAuth();

      await controller.adminDeleteManufacturer(ADMIN_AUTH_HEADER, TEST_MANUFACTURER_ID);

      expect(mockService.deleteManufacturer).toHaveBeenCalledWith(
        TEST_MANUFACTURER_ID,
        TEST_ADMIN_ID,
        true,
      );
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.adminDeleteManufacturer(VALID_AUTH_HEADER, TEST_MANUFACTURER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.deleteManufacturer).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate service errors from getAllRetailers', async () => {
      mockService.findAllRetailers.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllRetailers()).rejects.toThrow('DB error');
    });

    it('should propagate service errors from createMyRetailerListing', async () => {
      mockAuthSuccess();
      mockService.createRetailer.mockRejectedValue(
        new ForbiddenException('User already has a retailer listing'),
      );

      await expect(
        controller.createMyRetailerListing(VALID_AUTH_HEADER, { business_name: 'Duplicate' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate service errors from adminDeleteRetailer', async () => {
      mockAdminAuth();
      mockService.deleteRetailer.mockRejectedValue(new Error('Not found'));

      await expect(
        controller.adminDeleteRetailer(ADMIN_AUTH_HEADER, 'nonexistent'),
      ).rejects.toThrow('Not found');
    });

    it('should propagate service errors from getAllManufacturers', async () => {
      mockService.findAllManufacturers.mockRejectedValue(new Error('Connection error'));

      await expect(controller.getAllManufacturers()).rejects.toThrow('Connection error');
    });

    it('should propagate service errors from adminCreateManufacturer', async () => {
      mockAdminAuth();
      mockService.adminCreateManufacturer.mockRejectedValue(new Error('Create failed'));

      await expect(
        controller.adminCreateManufacturer(ADMIN_AUTH_HEADER, {
          user_id: TEST_USER_ID,
          business_name: 'Fail Mfg',
        }),
      ).rejects.toThrow('Create failed');
    });
  });
});
