import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentStatus, UserRole, AdminCreateMembershipDto } from '@newmeca/shared';
import { MembershipsController } from '../memberships.controller';
import { MembershipsService } from '../memberships.service';
import { MecaIdService } from '../meca-id.service';
import { MasterSecondaryService } from '../master-secondary.service';
import { MembershipSyncService } from '../membership-sync.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { createMockMembership, createMockProfile } from '../../../test/utils/test-utils';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockMembershipsService() {
  return {
    createMembership: jest.fn(),
    canPurchaseMembership: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getActiveMembership: jest.fn(),
    renewMembership: jest.fn(),
    getAllMembershipsByUser: jest.fn(),
    getAllMemberships: jest.fn(),
    getAllMembershipsForMembersList: jest.fn(),
    adminAssignMembership: jest.fn(),
    adminCreateMembership: jest.fn(),
    getTeamUpgradeDetails: jest.fn(),
    applyTeamUpgrade: jest.fn(),
    updateTeamName: jest.fn(),
    updateVehicleInfo: jest.fn(),
    superAdminOverrideMecaId: jest.fn(),
    renewMembershipKeepMecaId: jest.fn(),
    cancelMembershipImmediately: jest.fn(),
    cancelMembershipAtRenewal: jest.fn(),
    refundMembership: jest.fn(),
    getCancellationInfo: jest.fn(),
    getSubscriptionStatus: jest.fn(),
    cancelAutoRenewal: jest.fn(),
    enableAutoRenewal: jest.fn(),
    createBillingPortalSession: jest.fn(),
  };
}

function createMockMecaIdService() {
  return {
    getUserMecaIds: jest.fn(),
    getAllMecaIdHistory: jest.fn(),
    getMecaIdHistory: jest.fn(),
    assignMecaIdToMembership: jest.fn(),
    findPreviousMembership: jest.fn(),
    checkReactivationEligibility: jest.fn(),
  };
}

function createMockMasterSecondaryService() {
  return {
    upgradeToMaster: jest.fn(),
    createSecondaryMembership: jest.fn(),
    getSecondaryMemberships: jest.fn(),
    getMasterMembershipInfo: jest.fn(),
    removeSecondary: jest.fn(),
    upgradeToIndependent: jest.fn(),
    markSecondaryPaid: jest.fn(),
    updateSecondaryDetails: jest.fn(),
    getControlledMecaIds: jest.fn(),
    hasAccessToMecaId: jest.fn(),
    isSecondaryProfile: jest.fn(),
    fixSecondaryMembershipsWithoutProfiles: jest.fn(),
  };
}

function createMockMembershipSyncService() {
  return {
    triggerDailySync: jest.fn(),
    setProfileActive: jest.fn(),
    syncProfileMembershipStatus: jest.fn(),
  };
}

function createMockSupabaseAdminService() {
  return {
    getClient: jest.fn().mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user_123' } },
          error: null,
        }),
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const ADMIN_AUTH_HEADER = 'Bearer valid-admin-token';
const USER_AUTH_HEADER = 'Bearer valid-user-token';
const ADMIN_PROFILE = createMockProfile({
  id: 'admin_123',
  role: UserRole.ADMIN,
  email: 'admin@test.com',
});
const USER_PROFILE = createMockProfile({
  id: 'user_123',
  role: UserRole.USER,
  email: 'user@test.com',
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('MembershipsController', () => {
  let controller: MembershipsController;
  let membershipsService: ReturnType<typeof createMockMembershipsService>;
  let mecaIdService: ReturnType<typeof createMockMecaIdService>;
  let masterSecondaryService: ReturnType<typeof createMockMasterSecondaryService>;
  let membershipSyncService: ReturnType<typeof createMockMembershipSyncService>;
  let supabaseAdmin: ReturnType<typeof createMockSupabaseAdminService>;
  let mockEm: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    membershipsService = createMockMembershipsService();
    mecaIdService = createMockMecaIdService();
    masterSecondaryService = createMockMasterSecondaryService();
    membershipSyncService = createMockMembershipSyncService();
    supabaseAdmin = createMockSupabaseAdminService();
    mockEm = createMockEntityManager() as unknown as jest.Mocked<EntityManager>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipsController],
      providers: [
        { provide: MembershipsService, useValue: membershipsService },
        { provide: MecaIdService, useValue: mecaIdService },
        { provide: MasterSecondaryService, useValue: masterSecondaryService },
        { provide: MembershipSyncService, useValue: membershipSyncService },
        { provide: SupabaseAdminService, useValue: supabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<MembershipsController>(MembershipsController);
  });

  // -----------------------------------------------------------------------
  // Helper: configure mocks for admin auth flow
  // -----------------------------------------------------------------------
  function setupAdminAuth() {
    supabaseAdmin.getClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin_123' } },
          error: null,
        }),
      },
    } as any);
    mockEm.findOne.mockResolvedValue(ADMIN_PROFILE as any);
  }

  function setupUserAuth(userId = 'user_123') {
    supabaseAdmin.getClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        }),
      },
    } as any);
    mockEm.findOne.mockResolvedValue({ ...USER_PROFILE, id: userId } as any);
  }

  function setupAuthFailure() {
    supabaseAdmin.getClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        }),
      },
    } as any);
  }

  // =======================================================================
  // 1. createMembership
  // =======================================================================
  describe('createMembership', () => {
    it('should delegate to membershipsService.createMembership', async () => {
      const data = {
        userId: 'user_123',
        membershipTypeConfigId: 'config_123',
        amountPaid: 50,
      };
      const expected = createMockMembership();
      membershipsService.createMembership.mockResolvedValue(expected);

      const result = await controller.createMembership(data);

      expect(membershipsService.createMembership).toHaveBeenCalledWith(data);
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // 2. canPurchaseMembership
  // =======================================================================
  describe('canPurchaseMembership', () => {
    it('should return canPurchase true when allowed', async () => {
      membershipsService.canPurchaseMembership.mockResolvedValue({
        allowed: true,
        reason: undefined,
        existingMembershipId: undefined,
      });

      const result = await controller.canPurchaseMembership('user_123', 'config_123');

      expect(membershipsService.canPurchaseMembership).toHaveBeenCalledWith('user_123', 'config_123');
      expect(result).toEqual({
        canPurchase: true,
        reason: undefined,
        existingMembershipId: undefined,
      });
    });

    it('should return canPurchase false with reason when not allowed', async () => {
      membershipsService.canPurchaseMembership.mockResolvedValue({
        allowed: false,
        reason: 'Already has active membership',
        existingMembershipId: 'existing_123',
      });

      const result = await controller.canPurchaseMembership('user_123', 'config_456');

      expect(result).toEqual({
        canPurchase: false,
        reason: 'Already has active membership',
        existingMembershipId: 'existing_123',
      });
    });
  });

  // =======================================================================
  // 3. getMembership
  // =======================================================================
  describe('getMembership', () => {
    it('should delegate to membershipsService.findById', async () => {
      const expected = createMockMembership();
      membershipsService.findById.mockResolvedValue(expected);

      const result = await controller.getMembership('membership_123');

      expect(membershipsService.findById).toHaveBeenCalledWith('membership_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // 4. updateMembership
  // =======================================================================
  describe('updateMembership', () => {
    it('should delegate to membershipsService.update', async () => {
      const updateData = { teamName: 'New Team' };
      const expected = createMockMembership(updateData);
      membershipsService.update.mockResolvedValue(expected);

      const result = await controller.updateMembership('membership_123', updateData as any);

      expect(membershipsService.update).toHaveBeenCalledWith('membership_123', updateData);
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // 5. deleteMembership
  // =======================================================================
  describe('deleteMembership', () => {
    it('should delegate to membershipsService.delete', async () => {
      membershipsService.delete.mockResolvedValue(undefined);

      await controller.deleteMembership('membership_123');

      expect(membershipsService.delete).toHaveBeenCalledWith('membership_123');
    });
  });

  // =======================================================================
  // 6. getUserActiveMembership
  // =======================================================================
  describe('getUserActiveMembership', () => {
    it('should return active membership for user', async () => {
      const expected = createMockMembership();
      membershipsService.getActiveMembership.mockResolvedValue(expected);

      const result = await controller.getUserActiveMembership('user_123');

      expect(membershipsService.getActiveMembership).toHaveBeenCalledWith('user_123');
      expect(result).toBe(expected);
    });

    it('should return null when no active membership exists', async () => {
      membershipsService.getActiveMembership.mockResolvedValue(null);

      const result = await controller.getUserActiveMembership('user_no_membership');

      expect(result).toBeNull();
    });
  });

  // =======================================================================
  // 7. renewMembership
  // =======================================================================
  describe('renewMembership', () => {
    it('should delegate to membershipsService.renewMembership', async () => {
      const expected = createMockMembership();
      membershipsService.renewMembership.mockResolvedValue(expected);

      const result = await controller.renewMembership('user_123', 'config_123');

      expect(membershipsService.renewMembership).toHaveBeenCalledWith('user_123', 'config_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // 8. getAllMemberships (admin-protected)
  // =======================================================================
  describe('getAllMemberships', () => {
    it('should return all memberships for admin', async () => {
      setupAdminAuth();
      const expected = [createMockMembership()];
      membershipsService.getAllMemberships.mockResolvedValue(expected);

      const result = await controller.getAllMemberships(ADMIN_AUTH_HEADER);

      expect(membershipsService.getAllMemberships).toHaveBeenCalled();
      expect(result).toBe(expected);
    });

    it('should throw UnauthorizedException when no auth header', async () => {
      await expect(controller.getAllMemberships(undefined as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when invalid token', async () => {
      setupAuthFailure();

      await expect(controller.getAllMemberships(ADMIN_AUTH_HEADER))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      setupUserAuth();

      await expect(controller.getAllMemberships(USER_AUTH_HEADER))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // =======================================================================
  // 9. adminAssignMembership (admin-protected)
  // =======================================================================
  describe('adminAssignMembership', () => {
    const assignData = {
      userId: 'user_456',
      membershipTypeConfigId: 'config_123',
      durationMonths: 12,
    };

    it('should assign membership when called by admin', async () => {
      setupAdminAuth();
      const expected = createMockMembership();
      membershipsService.adminAssignMembership.mockResolvedValue(expected);

      const result = await controller.adminAssignMembership(ADMIN_AUTH_HEADER, assignData);

      expect(membershipsService.adminAssignMembership).toHaveBeenCalledWith(assignData);
      expect(result).toBe(expected);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      setupUserAuth();

      await expect(controller.adminAssignMembership(USER_AUTH_HEADER, assignData))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // =======================================================================
  // 10. adminCreateMembership (admin-protected + Zod validation)
  // =======================================================================
  describe('adminCreateMembership', () => {
    const validData = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      membershipTypeConfigId: '550e8400-e29b-41d4-a716-446655440001',
      paymentMethod: 'cash',
      hasTeamAddon: false,
      businessCountry: 'US',
      billingCountry: 'USA',
      createInvoice: false,
    } as AdminCreateMembershipDto;

    it('should create membership when called by admin with valid data', async () => {
      setupAdminAuth();
      const expected = {
        membership: createMockMembership(),
        order: undefined,
        invoice: undefined,
        message: 'Created',
      };
      membershipsService.adminCreateMembership.mockResolvedValue(expected);

      const result = await controller.adminCreateMembership(ADMIN_AUTH_HEADER, validData);

      expect(membershipsService.adminCreateMembership).toHaveBeenCalled();
      expect(result).toBe(expected);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      setupUserAuth();

      await expect(controller.adminCreateMembership(USER_AUTH_HEADER, validData))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when Zod validation fails', async () => {
      setupAdminAuth();
      const invalidData = {
        userId: 'not-a-uuid',
        membershipTypeConfigId: 'also-not-a-uuid',
        paymentMethod: 'invalid_method',
        hasTeamAddon: false,
        businessCountry: 'US',
        billingCountry: 'USA',
        createInvoice: false,
      } as unknown as AdminCreateMembershipDto;

      await expect(controller.adminCreateMembership(ADMIN_AUTH_HEADER, invalidData))
        .rejects.toThrow(BadRequestException);
    });
  });

  // =======================================================================
  // 11. getTeamUpgradeDetails
  // =======================================================================
  describe('getTeamUpgradeDetails', () => {
    it('should delegate to membershipsService.getTeamUpgradeDetails', async () => {
      const expected = {
        eligible: true,
        originalPrice: 25,
        proRatedPrice: 15,
        daysRemaining: 200,
        membershipId: 'membership_123',
        membershipEndDate: new Date(),
      };
      membershipsService.getTeamUpgradeDetails.mockResolvedValue(expected);

      const result = await controller.getTeamUpgradeDetails('membership_123');

      expect(membershipsService.getTeamUpgradeDetails).toHaveBeenCalledWith('membership_123');
      expect(result).toBe(expected);
    });

    it('should return null when membership not found', async () => {
      membershipsService.getTeamUpgradeDetails.mockResolvedValue(null);

      const result = await controller.getTeamUpgradeDetails('nonexistent');

      expect(result).toBeNull();
    });
  });

  // =======================================================================
  // 12. upgradeToMaster
  // =======================================================================
  describe('upgradeToMaster', () => {
    it('should delegate to masterSecondaryService.upgradeToMaster', async () => {
      const expected = createMockMembership();
      masterSecondaryService.upgradeToMaster.mockResolvedValue(expected);

      const result = await controller.upgradeToMaster('membership_123');

      expect(masterSecondaryService.upgradeToMaster).toHaveBeenCalledWith('membership_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // 13. createSecondaryMembership
  // =======================================================================
  describe('createSecondaryMembership', () => {
    it('should delegate to masterSecondaryService with masterMembershipId merged', async () => {
      const bodyData = {
        membershipTypeConfigId: 'config_123',
        competitorName: 'Jane Doe',
        relationshipToMaster: 'spouse',
        createLogin: false,
      };
      const expected = createMockMembership();
      masterSecondaryService.createSecondaryMembership.mockResolvedValue(expected);

      const result = await controller.createSecondaryMembership('master_123', bodyData);

      expect(masterSecondaryService.createSecondaryMembership).toHaveBeenCalledWith({
        ...bodyData,
        masterMembershipId: 'master_123',
      });
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // 14. cancelMembershipImmediately (admin-protected, reason validation)
  // =======================================================================
  describe('cancelMembershipImmediately', () => {
    it('should cancel membership for admin with valid reason', async () => {
      setupAdminAuth();
      const expected = {
        success: true,
        membership: createMockMembership(),
        message: 'Membership cancelled',
      };
      membershipsService.cancelMembershipImmediately.mockResolvedValue(expected);

      const result = await controller.cancelMembershipImmediately(
        'membership_123',
        ADMIN_AUTH_HEADER,
        { reason: 'Member requested cancellation' },
      );

      expect(membershipsService.cancelMembershipImmediately).toHaveBeenCalledWith(
        'membership_123',
        'Member requested cancellation',
        'admin_123',
      );
      expect(result).toBe(expected);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      setupUserAuth();

      await expect(
        controller.cancelMembershipImmediately('membership_123', USER_AUTH_HEADER, {
          reason: 'Some reason here',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when reason is too short', async () => {
      setupAdminAuth();

      await expect(
        controller.cancelMembershipImmediately('membership_123', ADMIN_AUTH_HEADER, {
          reason: 'ab',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reason is empty', async () => {
      setupAdminAuth();

      await expect(
        controller.cancelMembershipImmediately('membership_123', ADMIN_AUTH_HEADER, {
          reason: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =======================================================================
  // 15. memberCancelMembership (authenticated user, ownership check)
  // =======================================================================
  describe('memberCancelMembership', () => {
    it('should cancel membership for the owner', async () => {
      setupUserAuth('user_123');
      const membership = {
        ...createMockMembership(),
        user: { id: 'user_123' },
        cancelledAt: undefined,
        paymentStatus: PaymentStatus.PAID,
      };
      membershipsService.findById.mockResolvedValue(membership);

      const cancelResult = {
        success: true,
        membership: {
          ...membership,
          endDate: new Date('2027-02-19'),
        },
        message: 'Cancelled',
      };
      membershipsService.cancelMembershipAtRenewal.mockResolvedValue(cancelResult);

      const result = await controller.memberCancelMembership(
        'membership_123',
        USER_AUTH_HEADER,
        { reason: 'Moving away' },
      );

      expect(result.success).toBe(true);
      expect(result.effectiveEndDate).toEqual(new Date('2027-02-19'));
      expect(membershipsService.cancelMembershipAtRenewal).toHaveBeenCalledWith(
        'membership_123',
        'Moving away',
        'user_123',
      );
    });

    it('should use default reason when none provided', async () => {
      setupUserAuth('user_123');
      const membership = {
        ...createMockMembership(),
        user: { id: 'user_123' },
        cancelledAt: undefined,
        paymentStatus: PaymentStatus.PAID,
      };
      membershipsService.findById.mockResolvedValue(membership);

      const cancelResult = {
        success: true,
        membership: { ...membership, endDate: new Date('2027-02-19') },
        message: 'Cancelled',
      };
      membershipsService.cancelMembershipAtRenewal.mockResolvedValue(cancelResult);

      await controller.memberCancelMembership('membership_123', USER_AUTH_HEADER, {});

      expect(membershipsService.cancelMembershipAtRenewal).toHaveBeenCalledWith(
        'membership_123',
        'Member requested cancellation',
        'user_123',
      );
    });

    it('should throw ForbiddenException when user does not own the membership', async () => {
      setupUserAuth('user_123');
      const membership = {
        ...createMockMembership(),
        user: { id: 'user_other' },
        cancelledAt: undefined,
        paymentStatus: PaymentStatus.PAID,
      };
      membershipsService.findById.mockResolvedValue(membership);

      await expect(
        controller.memberCancelMembership('membership_123', USER_AUTH_HEADER, {
          reason: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when membership is already cancelled', async () => {
      setupUserAuth('user_123');
      const membership = {
        ...createMockMembership(),
        user: { id: 'user_123' },
        cancelledAt: new Date(),
        paymentStatus: PaymentStatus.PAID,
      };
      membershipsService.findById.mockResolvedValue(membership);

      await expect(
        controller.memberCancelMembership('membership_123', USER_AUTH_HEADER, {
          reason: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when membership is not paid', async () => {
      setupUserAuth('user_123');
      const membership = {
        ...createMockMembership(),
        user: { id: 'user_123' },
        cancelledAt: undefined,
        paymentStatus: PaymentStatus.PENDING,
      };
      membershipsService.findById.mockResolvedValue(membership);

      await expect(
        controller.memberCancelMembership('membership_123', USER_AUTH_HEADER, {
          reason: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when no auth header', async () => {
      await expect(
        controller.memberCancelMembership('membership_123', undefined as any, {
          reason: 'test',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =======================================================================
  // 16. overrideMecaId (admin + super admin password)
  // =======================================================================
  describe('overrideMecaId', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, SUPER_ADMIN_PASSWORD: 'super-secret-123' };
      // We need to re-create the controller because SUPER_ADMIN_PASSWORD is read
      // at construction time. Since it is read from process.env via a property
      // initializer, we set it before each test. However, the controller was
      // already constructed in the outer beforeEach. We work around this by
      // directly setting the private field.
      (controller as any).SUPER_ADMIN_PASSWORD = 'super-secret-123';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should override MECA ID for admin with valid super admin password', async () => {
      setupAdminAuth();
      const expected = {
        success: true,
        membership: createMockMembership(),
        message: 'Changed from 700500 to 700600',
      };
      membershipsService.superAdminOverrideMecaId.mockResolvedValue(expected);

      const result = await controller.overrideMecaId(
        'membership_123',
        ADMIN_AUTH_HEADER,
        {
          newMecaId: 700600,
          superAdminPassword: 'super-secret-123',
          reason: 'Correcting a mistake in MECA ID assignment',
        },
      );

      expect(membershipsService.superAdminOverrideMecaId).toHaveBeenCalledWith(
        'membership_123',
        700600,
        'admin_123',
        'Correcting a mistake in MECA ID assignment',
      );
      expect(result).toBe(expected);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      setupUserAuth();

      await expect(
        controller.overrideMecaId('membership_123', USER_AUTH_HEADER, {
          newMecaId: 700600,
          superAdminPassword: 'super-secret-123',
          reason: 'Correcting a mistake in ID',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for invalid super admin password', async () => {
      setupAdminAuth();

      await expect(
        controller.overrideMecaId('membership_123', ADMIN_AUTH_HEADER, {
          newMecaId: 700600,
          superAdminPassword: 'wrong-password',
          reason: 'Correcting a mistake in ID',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid MECA ID (< 1)', async () => {
      setupAdminAuth();

      await expect(
        controller.overrideMecaId('membership_123', ADMIN_AUTH_HEADER, {
          newMecaId: 0,
          superAdminPassword: 'super-secret-123',
          reason: 'Correcting a mistake in ID',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reason is too short (< 10 chars)', async () => {
      setupAdminAuth();

      await expect(
        controller.overrideMecaId('membership_123', ADMIN_AUTH_HEADER, {
          newMecaId: 700600,
          superAdminPassword: 'super-secret-123',
          reason: 'short',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =======================================================================
  // Auth helpers (getAuthenticatedUser / requireAdmin / requireAdminOrOwner)
  // =======================================================================
  describe('auth helpers (via endpoints)', () => {
    it('should throw UnauthorizedException for missing Bearer prefix', async () => {
      await expect(controller.getAllMemberships('InvalidHeader'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for undefined auth header', async () => {
      await expect(controller.getAllMemberships(undefined as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when supabase returns error', async () => {
      setupAuthFailure();

      await expect(controller.getAllMemberships(ADMIN_AUTH_HEADER))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // =======================================================================
  // getMembershipsForMembersList (admin-protected)
  // =======================================================================
  describe('getMembershipsForMembersList', () => {
    it('should return lightweight memberships list for admin', async () => {
      setupAdminAuth();
      const expected = [{ id: 'membership_1' }];
      membershipsService.getAllMembershipsForMembersList.mockResolvedValue(expected);

      const result = await controller.getMembershipsForMembersList(ADMIN_AUTH_HEADER);

      expect(membershipsService.getAllMembershipsForMembersList).toHaveBeenCalled();
      expect(result).toBe(expected);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      setupUserAuth();

      await expect(controller.getMembershipsForMembersList(USER_AUTH_HEADER))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // =======================================================================
  // getAllUserMemberships
  // =======================================================================
  describe('getAllUserMemberships', () => {
    it('should delegate to membershipsService.getAllMembershipsByUser', async () => {
      const expected = [createMockMembership()];
      membershipsService.getAllMembershipsByUser.mockResolvedValue(expected);

      const result = await controller.getAllUserMemberships('user_123');

      expect(membershipsService.getAllMembershipsByUser).toHaveBeenCalledWith('user_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // getUserMecaIds
  // =======================================================================
  describe('getUserMecaIds', () => {
    it('should delegate to mecaIdService.getUserMecaIds', async () => {
      const expected = [{ mecaId: 700500, membershipId: 'membership_123' }];
      mecaIdService.getUserMecaIds.mockResolvedValue(expected);

      const result = await controller.getUserMecaIds('user_123');

      expect(mecaIdService.getUserMecaIds).toHaveBeenCalledWith('user_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // updateTeamName
  // =======================================================================
  describe('updateTeamName', () => {
    it('should delegate to membershipsService.updateTeamName', async () => {
      const expected = createMockMembership({ teamName: 'Speed Demons' });
      membershipsService.updateTeamName.mockResolvedValue(expected);

      const result = await controller.updateTeamName('membership_123', 'Speed Demons', false);

      expect(membershipsService.updateTeamName).toHaveBeenCalledWith(
        'membership_123',
        'Speed Demons',
        false,
      );
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // updateVehicleInfo
  // =======================================================================
  describe('updateVehicleInfo', () => {
    it('should delegate to membershipsService.updateVehicleInfo', async () => {
      const vehicleData = {
        vehicleMake: 'Honda',
        vehicleModel: 'Civic',
        vehicleColor: 'Blue',
        vehicleLicensePlate: 'ABC123',
      };
      const expected = createMockMembership(vehicleData);
      membershipsService.updateVehicleInfo.mockResolvedValue(expected);

      const result = await controller.updateVehicleInfo('membership_123', vehicleData);

      expect(membershipsService.updateVehicleInfo).toHaveBeenCalledWith('membership_123', vehicleData);
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // applyTeamUpgrade
  // =======================================================================
  describe('applyTeamUpgrade', () => {
    it('should delegate to membershipsService.applyTeamUpgrade', async () => {
      const expected = createMockMembership({ hasTeamAddon: true });
      membershipsService.applyTeamUpgrade.mockResolvedValue(expected);

      const result = await controller.applyTeamUpgrade('membership_123', {
        teamName: 'Speed Demons',
        teamDescription: 'We are fast',
      });

      expect(membershipsService.applyTeamUpgrade).toHaveBeenCalledWith(
        'membership_123',
        'Speed Demons',
        'We are fast',
      );
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // getSecondaryMemberships
  // =======================================================================
  describe('getSecondaryMemberships', () => {
    it('should delegate to masterSecondaryService.getSecondaryMemberships', async () => {
      const expected = [{ id: 'sec_1', competitorName: 'Jane' }];
      masterSecondaryService.getSecondaryMemberships.mockResolvedValue(expected);

      const result = await controller.getSecondaryMemberships('master_123');

      expect(masterSecondaryService.getSecondaryMemberships).toHaveBeenCalledWith('master_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // getMasterMembershipInfo
  // =======================================================================
  describe('getMasterMembershipInfo', () => {
    it('should delegate to masterSecondaryService.getMasterMembershipInfo', async () => {
      const expected = {
        id: 'master_123',
        mecaId: 700500,
        accountType: 'master',
        secondaries: [],
        maxSecondaries: 10,
        canAddMore: true,
      };
      masterSecondaryService.getMasterMembershipInfo.mockResolvedValue(expected);

      const result = await controller.getMasterMembershipInfo('master_123');

      expect(masterSecondaryService.getMasterMembershipInfo).toHaveBeenCalledWith('master_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // removeSecondary
  // =======================================================================
  describe('removeSecondary', () => {
    it('should delegate to masterSecondaryService.removeSecondary', async () => {
      const expected = createMockMembership();
      masterSecondaryService.removeSecondary.mockResolvedValue(expected);

      const result = await controller.removeSecondary('master_123', 'secondary_456', 'user_123');

      expect(masterSecondaryService.removeSecondary).toHaveBeenCalledWith('secondary_456', 'user_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // upgradeToIndependent
  // =======================================================================
  describe('upgradeToIndependent', () => {
    it('should delegate to masterSecondaryService.upgradeToIndependent', async () => {
      const expected = createMockMembership();
      masterSecondaryService.upgradeToIndependent.mockResolvedValue(expected);

      const result = await controller.upgradeToIndependent('secondary_456');

      expect(masterSecondaryService.upgradeToIndependent).toHaveBeenCalledWith('secondary_456');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // markSecondaryPaid
  // =======================================================================
  describe('markSecondaryPaid', () => {
    it('should delegate to masterSecondaryService.markSecondaryPaid', async () => {
      const expected = createMockMembership();
      masterSecondaryService.markSecondaryPaid.mockResolvedValue(expected);

      const result = await controller.markSecondaryPaid('secondary_456', {
        amountPaid: 25,
        transactionId: 'tx_123',
      });

      expect(masterSecondaryService.markSecondaryPaid).toHaveBeenCalledWith(
        'secondary_456',
        25,
        'tx_123',
      );
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // updateSecondaryDetails
  // =======================================================================
  describe('updateSecondaryDetails', () => {
    it('should delegate to masterSecondaryService.updateSecondaryDetails', async () => {
      const expected = createMockMembership();
      masterSecondaryService.updateSecondaryDetails.mockResolvedValue(expected);

      const result = await controller.updateSecondaryDetails('secondary_456', {
        requestingUserId: 'user_123',
        competitorName: 'Updated Name',
        vehicleMake: 'Toyota',
      });

      expect(masterSecondaryService.updateSecondaryDetails).toHaveBeenCalledWith(
        'secondary_456',
        'user_123',
        { competitorName: 'Updated Name', vehicleMake: 'Toyota' },
      );
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // getControlledMecaIds
  // =======================================================================
  describe('getControlledMecaIds', () => {
    it('should delegate to masterSecondaryService.getControlledMecaIds', async () => {
      const expected = [
        { mecaId: 700500, membershipId: 'm1', profileId: 'p1', competitorName: 'John', isOwn: true },
      ];
      masterSecondaryService.getControlledMecaIds.mockResolvedValue(expected);

      const result = await controller.getControlledMecaIds('user_123');

      expect(masterSecondaryService.getControlledMecaIds).toHaveBeenCalledWith('user_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // hasAccessToMecaId
  // =======================================================================
  describe('hasAccessToMecaId', () => {
    it('should return true when user has access', async () => {
      masterSecondaryService.hasAccessToMecaId.mockResolvedValue(true);

      const result = await controller.hasAccessToMecaId('user_123', '700500');

      expect(masterSecondaryService.hasAccessToMecaId).toHaveBeenCalledWith('user_123', 700500);
      expect(result).toEqual({ hasAccess: true });
    });

    it('should return false for non-numeric mecaId', async () => {
      const result = await controller.hasAccessToMecaId('user_123', 'not-a-number');

      expect(masterSecondaryService.hasAccessToMecaId).not.toHaveBeenCalled();
      expect(result).toEqual({ hasAccess: false });
    });
  });

  // =======================================================================
  // isSecondaryProfile
  // =======================================================================
  describe('isSecondaryProfile', () => {
    it('should return isSecondary status', async () => {
      masterSecondaryService.isSecondaryProfile.mockResolvedValue(true);

      const result = await controller.isSecondaryProfile('profile_123');

      expect(masterSecondaryService.isSecondaryProfile).toHaveBeenCalledWith('profile_123');
      expect(result).toEqual({ isSecondary: true });
    });
  });

  // =======================================================================
  // cancelMembershipAtRenewal (admin-protected)
  // =======================================================================
  describe('cancelMembershipAtRenewal', () => {
    it('should schedule cancellation for admin with valid reason', async () => {
      setupAdminAuth();
      const expected = {
        success: true,
        membership: createMockMembership(),
        message: 'Scheduled',
      };
      membershipsService.cancelMembershipAtRenewal.mockResolvedValue(expected);

      const result = await controller.cancelMembershipAtRenewal(
        'membership_123',
        ADMIN_AUTH_HEADER,
        { reason: 'Member moving to different organization' },
      );

      expect(membershipsService.cancelMembershipAtRenewal).toHaveBeenCalledWith(
        'membership_123',
        'Member moving to different organization',
        'admin_123',
      );
      expect(result).toBe(expected);
    });

    it('should throw BadRequestException when reason is too short', async () => {
      setupAdminAuth();

      await expect(
        controller.cancelMembershipAtRenewal('membership_123', ADMIN_AUTH_HEADER, {
          reason: 'abc',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =======================================================================
  // refundMembership (admin-protected)
  // =======================================================================
  describe('refundMembership', () => {
    it('should refund membership for admin with valid reason', async () => {
      setupAdminAuth();
      const expected = {
        success: true,
        membership: createMockMembership(),
        stripeRefund: { id: 'refund_123', amount: 5000, status: 'succeeded' },
        message: 'Refunded',
      };
      membershipsService.refundMembership.mockResolvedValue(expected);

      const result = await controller.refundMembership(
        'membership_123',
        ADMIN_AUTH_HEADER,
        { reason: 'Duplicate charge on account' },
      );

      expect(membershipsService.refundMembership).toHaveBeenCalledWith(
        'membership_123',
        'Duplicate charge on account',
        'admin_123',
      );
      expect(result).toBe(expected);
    });

    it('should throw BadRequestException when reason is too short', async () => {
      setupAdminAuth();

      await expect(
        controller.refundMembership('membership_123', ADMIN_AUTH_HEADER, { reason: 'no' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =======================================================================
  // getCancellationInfo (admin-protected)
  // =======================================================================
  describe('getCancellationInfo', () => {
    it('should return cancellation info for admin', async () => {
      setupAdminAuth();
      const expected = {
        isCancelled: true,
        cancelAtPeriodEnd: false,
        cancelledAt: new Date(),
        cancellationReason: 'Requested by member',
        cancelledBy: 'admin_123',
      };
      membershipsService.getCancellationInfo.mockResolvedValue(expected);

      const result = await controller.getCancellationInfo('membership_123', ADMIN_AUTH_HEADER);

      expect(membershipsService.getCancellationInfo).toHaveBeenCalledWith('membership_123');
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // getMecaIdHistory (admin-protected)
  // =======================================================================
  describe('getMecaIdHistory', () => {
    it('should return paginated MECA ID history for admin', async () => {
      setupAdminAuth();
      const expected = { items: [], total: 0 };
      mecaIdService.getAllMecaIdHistory.mockResolvedValue(expected);

      const result = await controller.getMecaIdHistory(ADMIN_AUTH_HEADER, 25, 10);

      expect(mecaIdService.getAllMecaIdHistory).toHaveBeenCalledWith(25, 10);
      expect(result).toBe(expected);
    });

    it('should use default limit and offset when not provided', async () => {
      setupAdminAuth();
      const expected = { items: [], total: 0 };
      mecaIdService.getAllMecaIdHistory.mockResolvedValue(expected);

      const result = await controller.getMecaIdHistory(ADMIN_AUTH_HEADER);

      expect(mecaIdService.getAllMecaIdHistory).toHaveBeenCalledWith(50, 0);
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // getMecaIdHistoryById (admin-protected)
  // =======================================================================
  describe('getMecaIdHistoryById', () => {
    it('should return history for a specific MECA ID', async () => {
      setupAdminAuth();
      const expected = [{ mecaId: 700500, assignedAt: new Date() }];
      mecaIdService.getMecaIdHistory.mockResolvedValue(expected);

      const result = await controller.getMecaIdHistoryById(ADMIN_AUTH_HEADER, '700500');

      expect(mecaIdService.getMecaIdHistory).toHaveBeenCalledWith(700500);
      expect(result).toBe(expected);
    });

    it('should return empty array for non-numeric mecaId', async () => {
      setupAdminAuth();

      const result = await controller.getMecaIdHistoryById(ADMIN_AUTH_HEADER, 'abc');

      expect(mecaIdService.getMecaIdHistory).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  // =======================================================================
  // fixSecondaryProfiles (admin-protected)
  // =======================================================================
  describe('fixSecondaryProfiles', () => {
    it('should delegate to masterSecondaryService for admin', async () => {
      setupAdminAuth();
      const expected = { fixed: 3, errors: [] };
      masterSecondaryService.fixSecondaryMembershipsWithoutProfiles.mockResolvedValue(expected);

      const result = await controller.fixSecondaryProfiles(ADMIN_AUTH_HEADER);

      expect(masterSecondaryService.fixSecondaryMembershipsWithoutProfiles).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // syncMembershipStatuses (admin-protected)
  // =======================================================================
  describe('syncMembershipStatuses', () => {
    it('should trigger sync for admin', async () => {
      setupAdminAuth();
      const expected = { activated: 5, expired: 2 };
      membershipSyncService.triggerDailySync.mockResolvedValue(expected);

      const result = await controller.syncMembershipStatuses(ADMIN_AUTH_HEADER);

      expect(membershipSyncService.triggerDailySync).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  // =======================================================================
  // renewKeepMecaId (admin + super admin password)
  // =======================================================================
  describe('renewKeepMecaId', () => {
    beforeEach(() => {
      (controller as any).SUPER_ADMIN_PASSWORD = 'super-secret-123';
    });

    it('should renew with forced MECA ID for admin with valid super admin password', async () => {
      setupAdminAuth();
      const expected = {
        success: true,
        membership: createMockMembership(),
        message: 'Renewed with forced MECA ID',
      };
      membershipsService.renewMembershipKeepMecaId.mockResolvedValue(expected);

      const result = await controller.renewKeepMecaId(ADMIN_AUTH_HEADER, {
        userId: 'user_123',
        membershipTypeConfigId: 'config_123',
        previousMecaId: 700500,
        superAdminPassword: 'super-secret-123',
        reason: 'Member requested to keep their original MECA ID',
      });

      expect(membershipsService.renewMembershipKeepMecaId).toHaveBeenCalledWith(
        'user_123',
        'config_123',
        700500,
        'admin_123',
        'Member requested to keep their original MECA ID',
      );
      expect(result).toBe(expected);
    });

    it('should throw ForbiddenException for wrong super admin password', async () => {
      setupAdminAuth();

      await expect(
        controller.renewKeepMecaId(ADMIN_AUTH_HEADER, {
          userId: 'user_123',
          membershipTypeConfigId: 'config_123',
          previousMecaId: 700500,
          superAdminPassword: 'wrong',
          reason: 'Member requested to keep their original MECA ID',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid previousMecaId', async () => {
      setupAdminAuth();

      await expect(
        controller.renewKeepMecaId(ADMIN_AUTH_HEADER, {
          userId: 'user_123',
          membershipTypeConfigId: 'config_123',
          previousMecaId: 0,
          superAdminPassword: 'super-secret-123',
          reason: 'Member requested to keep their original MECA ID',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for short reason', async () => {
      setupAdminAuth();

      await expect(
        controller.renewKeepMecaId(ADMIN_AUTH_HEADER, {
          userId: 'user_123',
          membershipTypeConfigId: 'config_123',
          previousMecaId: 700500,
          superAdminPassword: 'super-secret-123',
          reason: 'short',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
