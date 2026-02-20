import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JudgesController } from '../judges.controller';
import { JudgesService } from '../judges.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { UserRole } from '@newmeca/shared';

describe('JudgesController', () => {
  let controller: JudgesController;
  let mockJudgesService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: { findOne: jest.Mock };

  const TEST_USER_ID = 'user_123';
  const TEST_ADMIN_ID = 'admin_456';
  const TEST_JUDGE_ID = 'judge_789';
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

  // Mock judge factory
  function createMockJudge(overrides: Record<string, any> = {}) {
    return {
      id: TEST_JUDGE_ID,
      user: {
        id: TEST_USER_ID,
        email: 'judge@example.com',
        first_name: 'Test',
        last_name: 'Judge',
        avatar_url: null,
      },
      application: { id: TEST_APP_ID },
      level: 'in_training',
      specialty: 'sound_quality',
      subSpecialties: [],
      headshotUrl: null,
      bio: null,
      preferredName: null,
      country: 'USA',
      state: 'TX',
      city: 'Austin',
      travelRadius: '100 miles',
      additionalRegions: [],
      isActive: true,
      approvedDate: new Date(),
      adminNotes: null,
      totalEventsJudged: 0,
      averageRating: null,
      totalRatings: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  // Mock application factory
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
      industryPositions: 'Installer',
      companyNames: null,
      educationTraining: null,
      competitionHistory: null,
      judgingExperience: null,
      specialty: 'sound_quality',
      subSpecialties: [],
      additionalSkills: null,
      essayWhyJudge: 'I love judging',
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

    mockJudgesService = {
      getAllJudges: jest.fn().mockResolvedValue([]),
      getJudge: jest.fn(),
      getJudgeByUserId: jest.fn().mockResolvedValue(null),
      createApplication: jest.fn(),
      getMyApplication: jest.fn().mockResolvedValue(null),
      getAllApplications: jest.fn().mockResolvedValue([]),
      getApplication: jest.fn(),
      adminCreateApplication: jest.fn(),
      adminQuickCreateApplication: jest.fn(),
      createJudgeDirectly: jest.fn(),
      reviewApplication: jest.fn(),
      updateJudge: jest.fn(),
      recordLevelChange: jest.fn(),
      verifyReference: jest.fn(),
      getMyAssignments: jest.fn().mockResolvedValue([]),
      getAssignment: jest.fn(),
      respondToAssignment: jest.fn(),
      createAssignment: jest.fn(),
      updateAssignment: jest.fn(),
      deleteAssignment: jest.fn(),
      getEventAssignments: jest.fn().mockResolvedValue([]),
      getJudgeAssignments: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JudgesController],
      providers: [
        { provide: JudgesService, useValue: mockJudgesService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<JudgesController>(JudgesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // PUBLIC ENDPOINTS
  // ====================================================================

  describe('getPublicDirectory', () => {
    it('should return public directory of active judges', async () => {
      const mockJudge = createMockJudge();
      mockJudgesService.getAllJudges.mockResolvedValue([mockJudge]);

      const result = await controller.getPublicDirectory();

      expect(mockJudgesService.getAllJudges).toHaveBeenCalledWith({
        isActive: true,
        state: undefined,
        specialty: undefined,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: TEST_JUDGE_ID,
          name: 'Test Judge',
          level: 'in_training',
          specialty: 'sound_quality',
          state: 'TX',
          city: 'Austin',
        }),
      );
    });

    it('should pass state and specialty filters', async () => {
      mockJudgesService.getAllJudges.mockResolvedValue([]);

      await controller.getPublicDirectory('TX', 'sound_quality');

      expect(mockJudgesService.getAllJudges).toHaveBeenCalledWith({
        isActive: true,
        state: 'TX',
        specialty: 'sound_quality',
      });
    });

    it('should return empty array when no active judges', async () => {
      mockJudgesService.getAllJudges.mockResolvedValue([]);

      const result = await controller.getPublicDirectory();

      expect(result).toEqual([]);
    });

    it('should fallback to email prefix when name is missing', async () => {
      const judge = createMockJudge({
        user: {
          id: TEST_USER_ID,
          email: 'nofirstname@example.com',
          first_name: null,
          last_name: null,
          avatar_url: null,
        },
      });
      mockJudgesService.getAllJudges.mockResolvedValue([judge]);

      const result = await controller.getPublicDirectory();

      expect(result[0].name).toBe('nofirstname');
    });
  });

  describe('getPublicJudgeProfile', () => {
    it('should return public profile for active judge', async () => {
      const mockJudge = createMockJudge();
      mockJudgesService.getJudge.mockResolvedValue(mockJudge);

      const result = await controller.getPublicJudgeProfile(TEST_JUDGE_ID);

      expect(mockJudgesService.getJudge).toHaveBeenCalledWith(TEST_JUDGE_ID);
      expect(result).toEqual(
        expect.objectContaining({
          id: TEST_JUDGE_ID,
          name: 'Test Judge',
          level: 'in_training',
        }),
      );
    });

    it('should return null for inactive judge', async () => {
      const inactiveJudge = createMockJudge({ isActive: false });
      mockJudgesService.getJudge.mockResolvedValue(inactiveJudge);

      const result = await controller.getPublicJudgeProfile(TEST_JUDGE_ID);

      expect(result).toBeNull();
    });

    it('should return null when judge not found', async () => {
      mockJudgesService.getJudge.mockResolvedValue(null);

      const result = await controller.getPublicJudgeProfile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('verifyReference', () => {
    it('should delegate to service and return success message', async () => {
      mockJudgesService.verifyReference.mockResolvedValue(undefined);

      const result = await controller.verifyReference('token123', 'Great reference');

      expect(mockJudgesService.verifyReference).toHaveBeenCalledWith('token123', 'Great reference');
      expect(result).toEqual({ message: 'Reference verified successfully' });
    });

    it('should propagate service errors', async () => {
      mockJudgesService.verifyReference.mockRejectedValue(
        new NotFoundException('Invalid verification token'),
      );

      await expect(
        controller.verifyReference('bad_token', 'response'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // AUTH HELPER TESTS (tested through endpoints)
  // ====================================================================

  describe('getCurrentUser (via authenticated endpoints)', () => {
    it('should throw UnauthorizedException when no auth header', async () => {
      await expect(
        controller.getMyApplication(undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when header does not start with Bearer', async () => {
      await expect(
        controller.getMyApplication('Basic some_token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(
        controller.getMyApplication('Bearer invalid_token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requireAdmin (via admin endpoints)', () => {
    it('should throw UnauthorizedException when no auth header', async () => {
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
      const mockApp = createMockApplication();
      const dto = { full_name: 'Test User' } as any;
      mockJudgesService.createApplication.mockResolvedValue(mockApp);

      const result = await controller.createApplication(VALID_AUTH_HEADER, dto);

      expect(mockJudgesService.createApplication).toHaveBeenCalledWith(TEST_USER_ID, dto);
      expect(result).toEqual(expect.objectContaining({ id: TEST_APP_ID }));
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.createApplication(undefined as any, {} as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockJudgesService.createApplication).not.toHaveBeenCalled();
    });
  });

  describe('getMyApplication', () => {
    it('should return application for authenticated user', async () => {
      mockAuthSuccess();
      const mockApp = createMockApplication();
      mockJudgesService.getMyApplication.mockResolvedValue(mockApp);

      const result = await controller.getMyApplication(VALID_AUTH_HEADER);

      expect(mockJudgesService.getMyApplication).toHaveBeenCalledWith(TEST_USER_ID);
      expect(result).toEqual({ data: expect.objectContaining({ id: TEST_APP_ID }) });
    });

    it('should return null data when no application exists', async () => {
      mockAuthSuccess();
      mockJudgesService.getMyApplication.mockResolvedValue(null);

      const result = await controller.getMyApplication(VALID_AUTH_HEADER);

      expect(result).toEqual({ data: null });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getMyApplication(undefined as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyJudgeProfile', () => {
    it('should return judge profile for authenticated user', async () => {
      mockAuthSuccess();
      const mockJudge = createMockJudge();
      mockJudgesService.getJudgeByUserId.mockResolvedValue(mockJudge);

      const result = await controller.getMyJudgeProfile(VALID_AUTH_HEADER);

      expect(mockJudgesService.getJudgeByUserId).toHaveBeenCalledWith(TEST_USER_ID);
      expect(result).toEqual({ data: expect.objectContaining({ id: TEST_JUDGE_ID }) });
    });

    it('should return null data when user is not a judge', async () => {
      mockAuthSuccess();
      mockJudgesService.getJudgeByUserId.mockResolvedValue(null);

      const result = await controller.getMyJudgeProfile(VALID_AUTH_HEADER);

      expect(result).toEqual({ data: null });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getMyJudgeProfile(undefined as any),
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
      mockJudgesService.getAllApplications.mockResolvedValue(apps);

      const result = await controller.getAllApplications(VALID_AUTH_HEADER);

      expect(mockJudgesService.getAllApplications).toHaveBeenCalledWith({
        status: undefined,
        specialty: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('should pass status and specialty filters', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockJudgesService.getAllApplications.mockResolvedValue([]);

      await controller.getAllApplications(VALID_AUTH_HEADER, 'pending' as any, 'sound_quality');

      expect(mockJudgesService.getAllApplications).toHaveBeenCalledWith({
        status: 'pending',
        specialty: 'sound_quality',
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
      mockJudgesService.getApplication.mockResolvedValue(mockApp);

      const result = await controller.getApplication(VALID_AUTH_HEADER, TEST_APP_ID);

      expect(mockJudgesService.getApplication).toHaveBeenCalledWith(TEST_APP_ID);
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

  describe('adminCreateApplication', () => {
    it('should create application as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockApp = createMockApplication();
      const dto = { user_id: TEST_USER_ID, full_name: 'Test' } as any;
      mockJudgesService.adminCreateApplication.mockResolvedValue(mockApp);

      const result = await controller.adminCreateApplication(VALID_AUTH_HEADER, dto);

      expect(mockJudgesService.adminCreateApplication).toHaveBeenCalledWith(TEST_ADMIN_ID, dto);
      expect(result).toEqual(expect.objectContaining({ id: TEST_APP_ID }));
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.adminCreateApplication(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('adminQuickCreateApplication', () => {
    it('should quick-create application as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockApp = createMockApplication();
      const dto = { user_id: TEST_USER_ID, full_name: 'Quick' } as any;
      mockJudgesService.adminQuickCreateApplication.mockResolvedValue(mockApp);

      const result = await controller.adminQuickCreateApplication(VALID_AUTH_HEADER, dto);

      expect(mockJudgesService.adminQuickCreateApplication).toHaveBeenCalledWith(TEST_ADMIN_ID, dto);
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

  describe('createJudgeDirectly', () => {
    it('should create judge directly as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockJudge = createMockJudge();
      const dto = { user_id: TEST_USER_ID, specialty: 'sound_quality' } as any;
      mockJudgesService.createJudgeDirectly.mockResolvedValue(mockJudge);

      const result = await controller.createJudgeDirectly(VALID_AUTH_HEADER, dto);

      expect(mockJudgesService.createJudgeDirectly).toHaveBeenCalledWith(TEST_ADMIN_ID, dto);
      expect(result).toEqual(expect.objectContaining({ id: TEST_JUDGE_ID }));
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.createJudgeDirectly(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reviewApplication', () => {
    it('should review application as admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const mockApp = createMockApplication({ status: 'approved' });
      const dto = { status: 'approved' } as any;
      mockJudgesService.reviewApplication.mockResolvedValue(mockApp);

      const result = await controller.reviewApplication(VALID_AUTH_HEADER, TEST_APP_ID, dto);

      expect(mockJudgesService.reviewApplication).toHaveBeenCalledWith(
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

  describe('getAllJudges', () => {
    it('should return all judges for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const judges = [createMockJudge()];
      mockJudgesService.getAllJudges.mockResolvedValue(judges);

      const result = await controller.getAllJudges(VALID_AUTH_HEADER);

      expect(result).toHaveLength(1);
    });

    it('should parse isActive filter correctly', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockJudgesService.getAllJudges.mockResolvedValue([]);

      await controller.getAllJudges(VALID_AUTH_HEADER, 'true');

      expect(mockJudgesService.getAllJudges).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('should parse isActive=false filter', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockJudgesService.getAllJudges.mockResolvedValue([]);

      await controller.getAllJudges(VALID_AUTH_HEADER, 'false');

      expect(mockJudgesService.getAllJudges).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should pass all filters to service', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockJudgesService.getAllJudges.mockResolvedValue([]);

      await controller.getAllJudges(
        VALID_AUTH_HEADER,
        'true',
        'certified' as any,
        'sound_quality',
        'TX',
      );

      expect(mockJudgesService.getAllJudges).toHaveBeenCalledWith({
        isActive: true,
        level: 'certified',
        specialty: 'sound_quality',
        state: 'TX',
      });
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getAllJudges(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getJudge', () => {
    it('should return judge when user is admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      const mockJudge = createMockJudge({ user: { id: 'other_user' } });
      mockJudgesService.getJudge.mockResolvedValue(mockJudge);
      mockEm.findOne.mockResolvedValue({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });

      const result = await controller.getJudge(VALID_AUTH_HEADER, TEST_JUDGE_ID);

      expect(result).toEqual(expect.objectContaining({ id: TEST_JUDGE_ID }));
    });

    it('should return judge when user is the judge themselves', async () => {
      mockAuthSuccess(TEST_USER_ID);
      const mockJudge = createMockJudge({ user: { id: TEST_USER_ID } });
      mockJudgesService.getJudge.mockResolvedValue(mockJudge);
      mockEm.findOne.mockResolvedValue({ id: TEST_USER_ID, role: UserRole.USER });

      const result = await controller.getJudge(VALID_AUTH_HEADER, TEST_JUDGE_ID);

      expect(result).toEqual(expect.objectContaining({ id: TEST_JUDGE_ID }));
    });

    it('should throw ForbiddenException when user is neither admin nor the judge', async () => {
      mockAuthSuccess('other_user_id');
      const mockJudge = createMockJudge({ user: { id: TEST_USER_ID } });
      mockJudgesService.getJudge.mockResolvedValue(mockJudge);
      mockEm.findOne.mockResolvedValue({ id: 'other_user_id', role: UserRole.USER });

      await expect(
        controller.getJudge(VALID_AUTH_HEADER, TEST_JUDGE_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getJudge(undefined as any, TEST_JUDGE_ID),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateJudge', () => {
    it('should update judge and not record level change when level unchanged', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const currentJudge = createMockJudge({ level: 'in_training' });
      const updatedJudge = createMockJudge({ level: 'in_training', bio: 'updated' });
      mockJudgesService.getJudge.mockResolvedValue(currentJudge);
      mockJudgesService.updateJudge.mockResolvedValue(updatedJudge);

      const dto = { bio: 'updated' } as any;
      await controller.updateJudge(VALID_AUTH_HEADER, TEST_JUDGE_ID, dto);

      expect(mockJudgesService.updateJudge).toHaveBeenCalledWith(TEST_JUDGE_ID, dto);
      expect(mockJudgesService.recordLevelChange).not.toHaveBeenCalled();
    });

    it('should record level change when level is updated', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const currentJudge = createMockJudge({ level: 'in_training' });
      const updatedJudge = createMockJudge({ level: 'certified' });
      mockJudgesService.getJudge.mockResolvedValue(currentJudge);
      mockJudgesService.updateJudge.mockResolvedValue(updatedJudge);

      const dto = { level: 'certified' } as any;
      await controller.updateJudge(VALID_AUTH_HEADER, TEST_JUDGE_ID, dto);

      expect(mockJudgesService.recordLevelChange).toHaveBeenCalledWith(
        TEST_JUDGE_ID,
        'in_training',
        'certified',
        TEST_ADMIN_ID,
        'Level changed by admin',
      );
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.updateJudge(VALID_AUTH_HEADER, TEST_JUDGE_ID, {} as any),
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
      mockJudgesService.getMyAssignments.mockResolvedValue(assignments);

      const result = await controller.getMyAssignments(VALID_AUTH_HEADER);

      expect(mockJudgesService.getMyAssignments).toHaveBeenCalledWith(TEST_USER_ID, {
        status: undefined,
        upcoming: false,
      });
      expect(result).toEqual(assignments);
    });

    it('should pass status and upcoming filters', async () => {
      mockAuthSuccess();
      mockJudgesService.getMyAssignments.mockResolvedValue([]);

      await controller.getMyAssignments(VALID_AUTH_HEADER, 'accepted' as any, 'true');

      expect(mockJudgesService.getMyAssignments).toHaveBeenCalledWith(TEST_USER_ID, {
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
        judge: { user: { id: 'other_user' } },
      };
      mockJudgesService.getAssignment.mockResolvedValue(mockAssignment);
      mockEm.findOne.mockResolvedValue({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });

      const result = await controller.getAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID);

      expect(result).toEqual(mockAssignment);
    });

    it('should return assignment when user is the assigned judge', async () => {
      mockAuthSuccess(TEST_USER_ID);
      const mockAssignment = {
        id: TEST_ASSIGNMENT_ID,
        judge: { user: { id: TEST_USER_ID } },
      };
      mockJudgesService.getAssignment.mockResolvedValue(mockAssignment);
      mockEm.findOne.mockResolvedValue({ id: TEST_USER_ID, role: UserRole.USER });

      const result = await controller.getAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID);

      expect(result).toEqual(mockAssignment);
    });

    it('should throw ForbiddenException when user is neither admin nor the judge', async () => {
      mockAuthSuccess('other_user');
      const mockAssignment = {
        id: TEST_ASSIGNMENT_ID,
        judge: { user: { id: TEST_USER_ID } },
      };
      mockJudgesService.getAssignment.mockResolvedValue(mockAssignment);
      mockEm.findOne.mockResolvedValue({ id: 'other_user', role: UserRole.USER });

      await expect(
        controller.getAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('respondToAssignment', () => {
    it('should respond to assignment for authenticated user', async () => {
      mockAuthSuccess();
      const mockResult = { id: TEST_ASSIGNMENT_ID, status: 'accepted' };
      mockJudgesService.respondToAssignment.mockResolvedValue(mockResult);

      const result = await controller.respondToAssignment(
        VALID_AUTH_HEADER,
        TEST_ASSIGNMENT_ID,
        { accept: true },
      );

      expect(mockJudgesService.respondToAssignment).toHaveBeenCalledWith(
        TEST_ASSIGNMENT_ID,
        TEST_USER_ID,
        true,
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should pass decline reason when declining', async () => {
      mockAuthSuccess();
      mockJudgesService.respondToAssignment.mockResolvedValue({});

      await controller.respondToAssignment(
        VALID_AUTH_HEADER,
        TEST_ASSIGNMENT_ID,
        { accept: false, decline_reason: 'Schedule conflict' },
      );

      expect(mockJudgesService.respondToAssignment).toHaveBeenCalledWith(
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
      const dto = { event_id: TEST_EVENT_ID, judge_id: TEST_JUDGE_ID } as any;
      mockJudgesService.createAssignment.mockResolvedValue(mockResult);

      const result = await controller.createAssignment(VALID_AUTH_HEADER, dto);

      expect(mockJudgesService.createAssignment).toHaveBeenCalledWith(dto, TEST_ADMIN_ID);
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
      mockJudgesService.updateAssignment.mockResolvedValue(mockResult);

      const result = await controller.updateAssignment(
        VALID_AUTH_HEADER,
        TEST_ASSIGNMENT_ID,
        dto,
      );

      expect(mockJudgesService.updateAssignment).toHaveBeenCalledWith(TEST_ASSIGNMENT_ID, dto);
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
      mockJudgesService.deleteAssignment.mockResolvedValue(undefined);

      const result = await controller.deleteAssignment(VALID_AUTH_HEADER, TEST_ASSIGNMENT_ID);

      expect(mockJudgesService.deleteAssignment).toHaveBeenCalledWith(TEST_ASSIGNMENT_ID);
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
      mockJudgesService.getEventAssignments.mockResolvedValue(assignments);

      const result = await controller.getEventAssignments(VALID_AUTH_HEADER, TEST_EVENT_ID);

      expect(mockJudgesService.getEventAssignments).toHaveBeenCalledWith(TEST_EVENT_ID);
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

  describe('getJudgeAssignments', () => {
    it('should return judge assignments for admin', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      const assignments = [{ id: TEST_ASSIGNMENT_ID }];
      mockJudgesService.getJudgeAssignments.mockResolvedValue(assignments);

      const result = await controller.getJudgeAssignments(VALID_AUTH_HEADER, TEST_JUDGE_ID);

      expect(mockJudgesService.getJudgeAssignments).toHaveBeenCalledWith(TEST_JUDGE_ID, {
        status: undefined,
        upcoming: false,
      });
      expect(result).toEqual(assignments);
    });

    it('should pass filters to service', async () => {
      mockAuthSuccess(TEST_ADMIN_ID);
      mockAdminProfile(TEST_ADMIN_ID);
      mockJudgesService.getJudgeAssignments.mockResolvedValue([]);

      await controller.getJudgeAssignments(
        VALID_AUTH_HEADER,
        TEST_JUDGE_ID,
        'accepted' as any,
        'true',
      );

      expect(mockJudgesService.getJudgeAssignments).toHaveBeenCalledWith(TEST_JUDGE_ID, {
        status: 'accepted',
        upcoming: true,
      });
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      mockAuthSuccess();
      mockUserProfile();

      await expect(
        controller.getJudgeAssignments(VALID_AUTH_HEADER, TEST_JUDGE_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate NotFoundException from getJudge service', async () => {
      mockAuthSuccess();
      mockJudgesService.getJudge.mockRejectedValue(
        new NotFoundException('Judge not found'),
      );

      await expect(
        controller.getJudge(VALID_AUTH_HEADER, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate errors from createApplication service', async () => {
      mockAuthSuccess();
      mockJudgesService.createApplication.mockRejectedValue(
        new Error('You already have an active judge application'),
      );

      await expect(
        controller.createApplication(VALID_AUTH_HEADER, {} as any),
      ).rejects.toThrow('You already have an active judge application');
    });
  });
});
