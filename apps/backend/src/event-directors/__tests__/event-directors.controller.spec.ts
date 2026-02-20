import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventDirectorsController } from '../event-directors.controller';
import { EventDirectorsService } from '../event-directors.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { UserRole } from '@newmeca/shared';

describe('EventDirectorsController', () => {
  let controller: EventDirectorsController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: { findOne: jest.Mock };

  const TEST_USER_ID = 'user_123';
  const TEST_ADMIN_ID = 'admin_456';
  const TEST_ED_ID = 'ed_789';
  const TEST_APP_ID = 'app_101';
  const TEST_EVENT_ID = 'event_202';
  const TEST_ASSIGNMENT_ID = 'assign_303';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';

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

  // Helper to configure profile lookup for admin
  function mockAdminProfile(userId: string = TEST_USER_ID) {
    mockEm.findOne.mockResolvedValue({ id: userId, role: UserRole.ADMIN });
  }

  // Helper to configure profile lookup for regular user
  function mockUserProfile(userId: string = TEST_USER_ID) {
    mockEm.findOne.mockResolvedValue({ id: userId, role: UserRole.USER });
  }

  // Mock EventDirector factory
  function createMockEventDirector(overrides: Record<string, any> = {}) {
    return {
      id: TEST_ED_ID,
      user: {
        id: TEST_USER_ID,
        email: 'ed@example.com',
        first_name: 'Test',
        last_name: 'Director',
        avatar_url: null,
      },
      application: { id: TEST_APP_ID },
      headshotUrl: null,
      bio: null,
      preferredName: null,
      country: 'USA',
      state: 'TX',
      city: 'Austin',
      specializedFormats: [],
      isActive: true,
      approvedDate: new Date(),
      totalEventsDirected: 0,
      averageRating: null,
      totalRatings: 0,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  // Mock EventDirectorApplication factory
  function createMockApplication(overrides: Record<string, any> = {}) {
    return {
      id: TEST_APP_ID,
      user: {
        id: TEST_USER_ID,
        email: 'applicant@example.com',
        first_name: 'Test',
        last_name: 'Applicant',
        avatar_url: null,
      },
      status: 'pending',
      applicationDate: new Date(),
      reviewedDate: null,
      reviewedBy: null,
      enteredBy: null,
      entryMethod: 'self',
      fullName: 'Test Applicant',
      preferredName: null,
      dateOfBirth: new Date('1990-01-01'),
      phone: '555-1234',
      secondaryPhone: null,
      headshotUrl: null,
      country: 'USA',
      state: 'TX',
      city: 'Austin',
      zip: '78701',
      travelRadius: '100 miles',
      additionalRegions: [],
      weekendAvailability: 'both',
      availabilityNotes: null,
      yearsInIndustry: 5,
      eventManagementExperience: 'Years of experience',
      teamManagementExperience: 'Team lead',
      equipmentResources: null,
      specializedFormats: [],
      essayWhyEd: 'I love directing',
      essayQualifications: 'Years of experience',
      essayAdditional: null,
      ackIndependentContractor: true,
      ackCodeOfConduct: true,
      ackBackgroundCheck: true,
      ackTermsConditions: true,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      references: {
        getItems: () => [],
      },
      ...overrides,
    };
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

    mockEm = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockService = {
      getDirectory: jest.fn().mockResolvedValue([]),
      getEventDirector: jest.fn(),
      getMyProfile: jest.fn().mockResolvedValue(null),
      createApplication: jest.fn(),
      getMyApplication: jest.fn().mockResolvedValue(null),
      getAllApplications: jest.fn().mockResolvedValue([]),
      getApplication: jest.fn(),
      adminQuickCreateApplication: jest.fn(),
      createEventDirectorDirectly: jest.fn(),
      reviewApplication: jest.fn(),
      getAllEventDirectors: jest.fn().mockResolvedValue([]),
      updateEventDirector: jest.fn(),
      verifyReference: jest.fn(),
      getMyAssignments: jest.fn().mockResolvedValue([]),
      getAssignment: jest.fn(),
      respondToAssignment: jest.fn(),
      createAssignment: jest.fn(),
      updateAssignment: jest.fn(),
      deleteAssignment: jest.fn(),
      getEventAssignments: jest.fn().mockResolvedValue([]),
      getEventDirectorAssignments: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventDirectorsController],
      providers: [
        { provide: EventDirectorsService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<EventDirectorsController>(EventDirectorsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // PUBLIC ENDPOINTS
  // ====================================================================

  describe('getDirectory', () => {
    it('should return event directors directory', async () => {
      const directory = [{ id: TEST_ED_ID, name: 'Test Director' }];
      mockService.getDirectory.mockResolvedValue(directory);

      const result = await controller.getDirectory();

      expect(mockService.getDirectory).toHaveBeenCalledWith({
        state: undefined,
        region: undefined,
      });
      expect(result).toEqual(directory);
    });

    it('should pass state and region filters', async () => {
      mockService.getDirectory.mockResolvedValue([]);

      await controller.getDirectory('TX', 'South');

      expect(mockService.getDirectory).toHaveBeenCalledWith({
        state: 'TX',
        region: 'South',
      });
    });

    it('should return empty array when no directors exist', async () => {
      mockService.getDirectory.mockResolvedValue([]);

      const result = await controller.getDirectory();

      expect(result).toEqual([]);
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile for active event director', async () => {
      const mockED = createMockEventDirector();
      mockService.getEventDirector.mockResolvedValue(mockED);

      const result = await controller.getPublicProfile(TEST_ED_ID);

      expect(mockService.getEventDirector).toHaveBeenCalledWith(TEST_ED_ID);
      expect(result).toEqual(
        expect.objectContaining({
          id: TEST_ED_ID,
          name: 'Test Director',
          state: 'TX',
          city: 'Austin',
        }),
      );
    });

    it('should return null for inactive event director', async () => {
      const inactiveED = createMockEventDirector({ isActive: false });
      mockService.getEventDirector.mockResolvedValue(inactiveED);

      const result = await controller.getPublicProfile(TEST_ED_ID);

      expect(result).toBeNull();
    });

    it('should return null when event director not found', async () => {
      mockService.getEventDirector.mockResolvedValue(null);

      const result = await controller.getPublicProfile('nonexistent');

      expect(result).toBeNull();
    });

    it('should fallback to email prefix when name is missing', async () => {
      const ed = createMockEventDirector({
        user: {
          id: TEST_USER_ID,
          email: 'noname@example.com',
          first_name: null,
          last_name: null,
          avatar_url: null,
        },
      });
      mockService.getEventDirector.mockResolvedValue(ed);

      const result = await controller.getPublicProfile(TEST_ED_ID);

      expect(result!.name).toBe('noname');
    });
  });

  describe('verifyReference', () => {
    it('should delegate to service and return success', async () => {
      mockService.verifyReference.mockResolvedValue(undefined);

      const result = await controller.verifyReference('token123', 'Good reference');

      expect(mockService.verifyReference).toHaveBeenCalledWith('token123', 'Good reference');
      expect(result).toEqual({ success: true });
    });

    it('should propagate service errors', async () => {
      mockService.verifyReference.mockRejectedValue(
        new Error('Invalid or expired verification token'),
      );

      await expect(
        controller.verifyReference('bad_token', 'response'),
      ).rejects.toThrow('Invalid or expired verification token');
    });
  });

  // ====================================================================
  // AUTH HELPER TESTS
  // ====================================================================

  describe('getCurrentUser (via authenticated endpoints)', () => {
    it('should return null when no auth header (controllers check this)', async () => {
      // EventDirectorsController returns null from getCurrentUser
      // and then the endpoint itself throws UnauthorizedException
      await expect(
        controller.createApplication(undefined as any, {} as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return null when header does not start with Bearer', async () => {
      await expect(
        controller.createApplication('Basic some_token', {} as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return null when token is invalid', async () => {
      mockAuthFailure();

      await expect(
        controller.createApplication('Bearer invalid_token', {} as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requireAdmin (via admin endpoints)', () => {
    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getAllApplications(undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getAllApplications(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when profile not found', async () => {
      mockAuthSuccess();
      mockEm.findOne.mockResolvedValue(null);

      await expect(
        controller.getAllApplications(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================================
  // USER ENDPOINTS (Authenticated)
  // ====================================================================

  describe('createApplication', () => {
    it('should create application for authenticated user', async () => {
      mockAuthSuccess();
      const dto = { full_name: 'Test User' } as any;
      const mockResult = { id: TEST_APP_ID };
      mockService.createApplication.mockResolvedValue(mockResult);

      const result = await controller.createApplication(VALID_AUTH_HEADER, dto);

      expect(mockService.createApplication).toHaveBeenCalledWith(TEST_USER_ID, dto);
      expect(result).toEqual(mockResult);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.createApplication(undefined as any, {} as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.createApplication).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(
        controller.createApplication('Bearer bad_token', {} as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.createApplication).not.toHaveBeenCalled();
    });
  });

  describe('getMyApplication', () => {
    it('should return application for authenticated user', async () => {
      mockAuthSuccess();
      const mockApp = createMockApplication();
      mockService.getMyApplication.mockResolvedValue(mockApp);

      const result = await controller.getMyApplication(VALID_AUTH_HEADER);

      expect(mockService.getMyApplication).toHaveBeenCalledWith(TEST_USER_ID);
      expect(result).toEqual({ data: mockApp });
    });

    it('should return null data when no application exists', async () => {
      mockAuthSuccess();
      mockService.getMyApplication.mockResolvedValue(null);

      const result = await controller.getMyApplication(VALID_AUTH_HEADER);

      expect(result).toEqual({ data: null });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getMyApplication(undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyProfile', () => {
    it('should return serialized event director profile for authenticated user', async () => {
      mockAuthSuccess();
      const mockED = createMockEventDirector();
      mockService.getMyProfile.mockResolvedValue(mockED);

      const result = await controller.getMyProfile(VALID_AUTH_HEADER);

      expect(mockService.getMyProfile).toHaveBeenCalledWith(TEST_USER_ID);
      expect(result).toEqual({ data: expect.objectContaining({ id: TEST_ED_ID }) });
    });

    it('should return null data when user is not an event director', async () => {
      mockAuthSuccess();
      mockService.getMyProfile.mockResolvedValue(null);

      const result = await controller.getMyProfile(VALID_AUTH_HEADER);

      expect(result).toEqual({ data: null });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getMyProfile(undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS
  // ====================================================================

  describe('getAllApplications', () => {
    it('should return all applications for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const apps = [createMockApplication()];
      mockService.getAllApplications.mockResolvedValue(apps);

      const result = await controller.getAllApplications(VALID_AUTH_HEADER);

      expect(mockService.getAllApplications).toHaveBeenCalledWith({
        status: undefined,
        region: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('should pass status and region filters', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockService.getAllApplications.mockResolvedValue([]);

      await controller.getAllApplications(VALID_AUTH_HEADER, 'pending' as any, 'South');

      expect(mockService.getAllApplications).toHaveBeenCalledWith({
        status: 'pending',
        region: 'South',
      });
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getAllApplications(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getApplication', () => {
    it('should return application by ID for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockApp = createMockApplication();
      mockService.getApplication.mockResolvedValue(mockApp);

      const result = await controller.getApplication(VALID_AUTH_HEADER, TEST_APP_ID);

      expect(mockService.getApplication).toHaveBeenCalledWith(TEST_APP_ID);
      expect(result).toEqual(expect.objectContaining({ id: TEST_APP_ID }));
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getApplication(VALID_AUTH_HEADER, TEST_APP_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('adminQuickCreateApplication', () => {
    it('should quick-create application as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockApp = createMockApplication();
      const dto = { user_id: TEST_USER_ID, full_name: 'Quick' } as any;
      mockService.adminQuickCreateApplication.mockResolvedValue(mockApp);

      const result = await controller.adminQuickCreateApplication(VALID_AUTH_HEADER, dto);

      expect(mockService.adminQuickCreateApplication).toHaveBeenCalledWith(TEST_ADMIN_ID, dto);
      expect(result).toEqual(expect.objectContaining({ id: TEST_APP_ID }));
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.adminQuickCreateApplication(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createEventDirectorDirectly', () => {
    it('should create event director directly as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockED = createMockEventDirector();
      const dto = { user_id: TEST_USER_ID, state: 'TX', city: 'Austin' } as any;
      mockService.createEventDirectorDirectly.mockResolvedValue(mockED);

      const result = await controller.createEventDirectorDirectly(VALID_AUTH_HEADER, dto);

      expect(mockService.createEventDirectorDirectly).toHaveBeenCalledWith(TEST_ADMIN_ID, dto);
      expect(result).toEqual(expect.objectContaining({ id: TEST_ED_ID }));
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.createEventDirectorDirectly(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reviewApplication', () => {
    it('should review application as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockApp = createMockApplication({ status: 'approved' });
      const dto = { status: 'approved' } as any;
      mockService.reviewApplication.mockResolvedValue(mockApp);

      const result = await controller.reviewApplication(VALID_AUTH_HEADER, TEST_APP_ID, dto);

      expect(mockService.reviewApplication).toHaveBeenCalledWith(
        TEST_APP_ID,
        TEST_ADMIN_ID,
        dto,
      );
      expect(result).toEqual(expect.objectContaining({ id: TEST_APP_ID }));
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.reviewApplication(VALID_AUTH_HEADER, TEST_APP_ID, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAllEventDirectors', () => {
    it('should return all event directors for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const eds = [createMockEventDirector()];
      mockService.getAllEventDirectors.mockResolvedValue(eds);

      const result = await controller.getAllEventDirectors(VALID_AUTH_HEADER);

      expect(result).toHaveLength(1);
    });

    it('should parse isActive filter correctly', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockService.getAllEventDirectors.mockResolvedValue([]);

      await controller.getAllEventDirectors(VALID_AUTH_HEADER, 'true');

      expect(mockService.getAllEventDirectors).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('should parse isActive=false filter', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockService.getAllEventDirectors.mockResolvedValue([]);

      await controller.getAllEventDirectors(VALID_AUTH_HEADER, 'false');

      expect(mockService.getAllEventDirectors).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should pass all filters to service', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockService.getAllEventDirectors.mockResolvedValue([]);

      await controller.getAllEventDirectors(VALID_AUTH_HEADER, 'true', 'TX', 'South');

      expect(mockService.getAllEventDirectors).toHaveBeenCalledWith({
        isActive: true,
        state: 'TX',
        region: 'South',
      });
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getAllEventDirectors(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getEventDirector', () => {
    it('should return event director by ID for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockED = createMockEventDirector();
      mockService.getEventDirector.mockResolvedValue(mockED);

      const result = await controller.getEventDirector(VALID_AUTH_HEADER, TEST_ED_ID);

      expect(mockService.getEventDirector).toHaveBeenCalledWith(TEST_ED_ID);
      expect(result).toEqual(expect.objectContaining({ id: TEST_ED_ID }));
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getEventDirector(VALID_AUTH_HEADER, TEST_ED_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateEventDirector', () => {
    it('should update event director for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockED = createMockEventDirector({ bio: 'Updated bio' });
      mockService.updateEventDirector.mockResolvedValue(mockED);
      const updates = { bio: 'Updated bio' };

      const result = await controller.updateEventDirector(VALID_AUTH_HEADER, TEST_ED_ID, updates);

      expect(mockService.updateEventDirector).toHaveBeenCalledWith(TEST_ED_ID, updates);
      expect(result).toEqual(expect.objectContaining({ id: TEST_ED_ID }));
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.updateEventDirector(VALID_AUTH_HEADER, TEST_ED_ID, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================================
  // EVENT ASSIGNMENT ENDPOINTS
  // ====================================================================

  describe('getMyAssignments', () => {
    it('should return assignments for authenticated user', async () => {
      mockAuthSuccess();
      const assignments = [{ id: TEST_ASSIGNMENT_ID }];
      mockService.getMyAssignments.mockResolvedValue(assignments);

      const result = await controller.getMyAssignments(VALID_AUTH_HEADER);

      expect(mockService.getMyAssignments).toHaveBeenCalledWith(TEST_USER_ID, {
        status: undefined,
        upcoming: false,
      });
      expect(result).toEqual(assignments);
    });

    it('should pass status and upcoming filters', async () => {
      mockAuthSuccess();
      mockService.getMyAssignments.mockResolvedValue([]);

      await controller.getMyAssignments(VALID_AUTH_HEADER, 'accepted' as any, 'true');

      expect(mockService.getMyAssignments).toHaveBeenCalledWith(TEST_USER_ID, {
        status: 'accepted',
        upcoming: true,
      });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getMyAssignments(undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getAssignment', () => {
    it('should return assignment when user is admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      const mockAssignment = {
        id: TEST_ASSIGNMENT_ID,
        eventDirector: { user: { id: 'other_user' } },
      };
      mockService.getAssignment.mockResolvedValue(mockAssignment);
      mockEm.findOne.mockResolvedValue({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });

      const result = await controller.getAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID);

      expect(result).toEqual(mockAssignment);
    });

    it('should return assignment when user is the assigned event director', async () => {
      mockAuthSuccess(TEST_USER_ID);
      const mockAssignment = {
        id: TEST_ASSIGNMENT_ID,
        eventDirector: { user: { id: TEST_USER_ID } },
      };
      mockService.getAssignment.mockResolvedValue(mockAssignment);
      mockEm.findOne.mockResolvedValue({ id: TEST_USER_ID, role: UserRole.USER });

      const result = await controller.getAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID);

      expect(result).toEqual(mockAssignment);
    });

    it('should throw ForbiddenException when user is neither admin nor the ED', async () => {
      mockAuthSuccess('other_user');
      const mockAssignment = {
        id: TEST_ASSIGNMENT_ID,
        eventDirector: { user: { id: TEST_USER_ID } },
      };
      mockService.getAssignment.mockResolvedValue(mockAssignment);
      mockEm.findOne.mockResolvedValue({ id: 'other_user', role: UserRole.USER });

      await expect(
        controller.getAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getAssignment(undefined as any, TEST_ASSIGNMENT_ID),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('respondToAssignment', () => {
    it('should respond to assignment for authenticated user', async () => {
      mockAuthSuccess();
      const mockResult = { id: TEST_ASSIGNMENT_ID, status: 'accepted' };
      mockService.respondToAssignment.mockResolvedValue(mockResult);

      const result = await controller.respondToAssignment(
        VALID_AUTH_HEADER,
        TEST_ASSIGNMENT_ID,
        { accept: true },
      );

      expect(mockService.respondToAssignment).toHaveBeenCalledWith(
        TEST_ASSIGNMENT_ID,
        TEST_USER_ID,
        true,
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should pass decline reason when declining', async () => {
      mockAuthSuccess();
      mockService.respondToAssignment.mockResolvedValue({});

      await controller.respondToAssignment(
        VALID_AUTH_HEADER,
        TEST_ASSIGNMENT_ID,
        { accept: false, decline_reason: 'Schedule conflict' },
      );

      expect(mockService.respondToAssignment).toHaveBeenCalledWith(
        TEST_ASSIGNMENT_ID,
        TEST_USER_ID,
        false,
        'Schedule conflict',
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.respondToAssignment(undefined as any, TEST_ASSIGNMENT_ID, { accept: true }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('createAssignment', () => {
    it('should create assignment as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockResult = { id: TEST_ASSIGNMENT_ID };
      const dto = { event_id: TEST_EVENT_ID, event_director_id: TEST_ED_ID } as any;
      mockService.createAssignment.mockResolvedValue(mockResult);

      const result = await controller.createAssignment(VALID_AUTH_HEADER, dto);

      expect(mockService.createAssignment).toHaveBeenCalledWith(dto, TEST_ADMIN_ID);
      expect(result).toEqual(mockResult);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.createAssignment(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateAssignment', () => {
    it('should update assignment as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockResult = { id: TEST_ASSIGNMENT_ID, status: 'completed' };
      const dto = { status: 'completed' } as any;
      mockService.updateAssignment.mockResolvedValue(mockResult);

      const result = await controller.updateAssignment(
        VALID_AUTH_HEADER,
        TEST_ASSIGNMENT_ID,
        dto,
      );

      expect(mockService.updateAssignment).toHaveBeenCalledWith(TEST_ASSIGNMENT_ID, dto);
      expect(result).toEqual(mockResult);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.updateAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteAssignment', () => {
    it('should delete assignment as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockService.deleteAssignment.mockResolvedValue(undefined);

      const result = await controller.deleteAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID);

      expect(mockService.deleteAssignment).toHaveBeenCalledWith(TEST_ASSIGNMENT_ID);
      expect(result).toEqual({ message: 'Assignment deleted successfully' });
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.deleteAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getEventAssignments', () => {
    it('should return event assignments for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const assignments = [{ id: TEST_ASSIGNMENT_ID }];
      mockService.getEventAssignments.mockResolvedValue(assignments);

      const result = await controller.getEventAssignments(VALID_AUTH_HEADER, TEST_EVENT_ID);

      expect(mockService.getEventAssignments).toHaveBeenCalledWith(TEST_EVENT_ID);
      expect(result).toEqual(assignments);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getEventAssignments(VALID_AUTH_HEADER, TEST_EVENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getEventDirectorAssignments', () => {
    it('should return event director assignments for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const assignments = [{ id: TEST_ASSIGNMENT_ID }];
      mockService.getEventDirectorAssignments.mockResolvedValue(assignments);

      const result = await controller.getEventDirectorAssignments(VALID_AUTH_HEADER, TEST_ED_ID);

      expect(mockService.getEventDirectorAssignments).toHaveBeenCalledWith(TEST_ED_ID, {
        status: undefined,
        upcoming: false,
      });
      expect(result).toEqual(assignments);
    });

    it('should pass filters to service', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockService.getEventDirectorAssignments.mockResolvedValue([]);

      await controller.getEventDirectorAssignments(
        VALID_AUTH_HEADER,
        TEST_ED_ID,
        'accepted' as any,
        'true',
      );

      expect(mockService.getEventDirectorAssignments).toHaveBeenCalledWith(TEST_ED_ID, {
        status: 'accepted',
        upcoming: true,
      });
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getEventDirectorAssignments(VALID_AUTH_HEADER, TEST_ED_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate NotFoundException from getEventDirector service', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockService.getEventDirector.mockRejectedValue(
        new NotFoundException('Event Director not found'),
      );

      await expect(
        controller.getEventDirector(VALID_AUTH_HEADER, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate errors from createApplication service', async () => {
      mockAuthSuccess();
      mockService.createApplication.mockRejectedValue(
        new Error('You have already submitted an Event Director application'),
      );

      await expect(
        controller.createApplication(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow('You have already submitted an Event Director application');
    });

    it('should propagate errors from getDirectory service', async () => {
      mockService.getDirectory.mockRejectedValue(new Error('DB error'));

      await expect(controller.getDirectory()).rejects.toThrow('DB error');
    });
  });
});
