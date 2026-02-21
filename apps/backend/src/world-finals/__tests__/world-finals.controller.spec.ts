import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WorldFinalsController } from '../world-finals.controller';
import { WorldFinalsService } from '../world-finals.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { Profile } from '../../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';

describe('WorldFinalsController', () => {
  let controller: WorldFinalsController;
  let mockWorldFinalsService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: { fork: jest.Mock; findOne: jest.Mock };

  const TEST_USER_ID = 'user_123';
  const TEST_SEASON_ID = 'season_123';
  const TEST_QUALIFICATION_ID = 'qual_123';
  const TEST_REGISTRATION_ID = 'reg_123';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';

  function mockAuthSuccess(userId: string = TEST_USER_ID, role: UserRole = UserRole.USER) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mockEm.findOne.mockResolvedValue({
      id: userId,
      email: 'test@example.com',
      role,
    });
  }

  function mockAdminAuthSuccess(userId: string = TEST_USER_ID) {
    mockAuthSuccess(userId, UserRole.ADMIN);
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
        auth: { getUser: mockGetUser },
      }),
    };

    mockEm = {
      fork: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
    };
    mockEm.fork.mockReturnValue(mockEm);

    mockWorldFinalsService = {
      getCurrentSeasonQualifications: jest.fn().mockResolvedValue([]),
      getSeasonQualifications: jest.fn().mockResolvedValue([]),
      getQualificationStats: jest.fn().mockResolvedValue({}),
      sendInvitation: jest.fn().mockResolvedValue({}),
      sendAllPendingInvitations: jest.fn().mockResolvedValue({ sent: 0, failed: 0 }),
      recalculateSeasonQualifications: jest.fn().mockResolvedValue({ newQualifications: 0, updatedQualifications: 0 }),
      redeemInvitation: jest.fn().mockResolvedValue(null),
      createRegistration: jest.fn().mockResolvedValue({}),
      getMyRegistrations: jest.fn().mockResolvedValue([]),
      getMyRegistration: jest.fn().mockResolvedValue(null),
      updateRegistration: jest.fn().mockResolvedValue({}),
      deleteRegistration: jest.fn().mockResolvedValue(undefined),
      getRegistrationsBySeasonAndClass: jest.fn().mockResolvedValue([]),
      getRegistrationStats: jest.fn().mockResolvedValue({}),
      submitVote: jest.fn().mockResolvedValue({}),
      getMyVotes: jest.fn().mockResolvedValue([]),
      hasUserVoted: jest.fn().mockResolvedValue(false),
      getVoteSummary: jest.fn().mockResolvedValue({}),
      getVotesByCategory: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorldFinalsController],
      providers: [
        { provide: WorldFinalsService, useValue: mockWorldFinalsService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<WorldFinalsController>(WorldFinalsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // AUTH HELPERS
  // ============================================

  describe('requireAuth behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.getMyRegistrations(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.getMyRegistrations('Basic some_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();
      await expect(controller.getMyRegistrations('Bearer bad_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should extract token correctly and call getUser', async () => {
      mockAuthSuccess();
      await controller.getMyRegistrations(VALID_AUTH_HEADER);
      expect(mockGetUser).toHaveBeenCalledWith('valid_token_abc');
    });
  });

  describe('requireAdmin behavior', () => {
    it('should throw ForbiddenException when user is not admin', async () => {
      mockAuthSuccess(TEST_USER_ID, UserRole.USER);
      await expect(controller.getQualificationStats(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should succeed when user is admin', async () => {
      mockAdminAuthSuccess();
      await controller.getQualificationStats(VALID_AUTH_HEADER);
      expect(mockWorldFinalsService.getQualificationStats).toHaveBeenCalled();
    });
  });

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  describe('getCurrentSeasonQualifications', () => {
    it('should return qualifications without auth', async () => {
      const quals = [{ id: 'q1', competitorName: 'Test' }];
      mockWorldFinalsService.getCurrentSeasonQualifications.mockResolvedValue(quals);

      const result = await controller.getCurrentSeasonQualifications();

      expect(result).toEqual(quals);
      expect(mockWorldFinalsService.getCurrentSeasonQualifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSeasonQualifications', () => {
    it('should return qualifications for a specific season', async () => {
      const quals = [{ id: 'q1' }];
      mockWorldFinalsService.getSeasonQualifications.mockResolvedValue(quals);

      const result = await controller.getSeasonQualifications(TEST_SEASON_ID);

      expect(result).toEqual(quals);
      expect(mockWorldFinalsService.getSeasonQualifications).toHaveBeenCalledWith(TEST_SEASON_ID);
    });
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  describe('getQualificationStats', () => {
    it('should return stats for admin', async () => {
      mockAdminAuthSuccess();
      const stats = { totalQualifications: 10 };
      mockWorldFinalsService.getQualificationStats.mockResolvedValue(stats);

      const result = await controller.getQualificationStats(VALID_AUTH_HEADER, TEST_SEASON_ID);

      expect(result).toEqual(stats);
      expect(mockWorldFinalsService.getQualificationStats).toHaveBeenCalledWith(TEST_SEASON_ID);
    });

    it('should reject non-admin users', async () => {
      mockAuthSuccess(TEST_USER_ID, UserRole.USER);

      await expect(
        controller.getQualificationStats(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockWorldFinalsService.getQualificationStats).not.toHaveBeenCalled();
    });
  });

  describe('sendInvitation', () => {
    it('should send invitation when admin', async () => {
      mockAdminAuthSuccess();
      const qual = { id: TEST_QUALIFICATION_ID, invitationSent: true };
      mockWorldFinalsService.sendInvitation.mockResolvedValue(qual);

      const result = await controller.sendInvitation(VALID_AUTH_HEADER, TEST_QUALIFICATION_ID);

      expect(result).toEqual(qual);
      expect(mockWorldFinalsService.sendInvitation).toHaveBeenCalledWith(TEST_QUALIFICATION_ID);
    });

    it('should reject non-admin users', async () => {
      mockAuthSuccess();

      await expect(
        controller.sendInvitation(VALID_AUTH_HEADER, TEST_QUALIFICATION_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sendAllPendingInvitations', () => {
    it('should send all pending invitations when admin', async () => {
      mockAdminAuthSuccess();
      const result_data = { sent: 5, failed: 1 };
      mockWorldFinalsService.sendAllPendingInvitations.mockResolvedValue(result_data);

      const result = await controller.sendAllPendingInvitations(VALID_AUTH_HEADER, TEST_SEASON_ID);

      expect(result).toEqual(result_data);
      expect(mockWorldFinalsService.sendAllPendingInvitations).toHaveBeenCalledWith(TEST_SEASON_ID);
    });

    it('should reject non-admin users', async () => {
      mockAuthSuccess();

      await expect(
        controller.sendAllPendingInvitations(VALID_AUTH_HEADER, TEST_SEASON_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('recalculateSeasonQualifications', () => {
    it('should recalculate qualifications when admin', async () => {
      mockAdminAuthSuccess();
      const data = { newQualifications: 3, updatedQualifications: 2 };
      mockWorldFinalsService.recalculateSeasonQualifications.mockResolvedValue(data);

      const result = await controller.recalculateSeasonQualifications(VALID_AUTH_HEADER, TEST_SEASON_ID);

      expect(result).toEqual(data);
      expect(mockWorldFinalsService.recalculateSeasonQualifications).toHaveBeenCalledWith(TEST_SEASON_ID);
    });

    it('should reject non-admin users', async () => {
      mockAuthSuccess();

      await expect(
        controller.recalculateSeasonQualifications(VALID_AUTH_HEADER, TEST_SEASON_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // INVITATION REDEMPTION
  // ============================================

  describe('redeemInvitation', () => {
    it('should return success when invitation is valid', async () => {
      const qual = { id: TEST_QUALIFICATION_ID, invitationRedeemed: true };
      mockWorldFinalsService.redeemInvitation.mockResolvedValue(qual);

      const result = await controller.redeemInvitation('valid_token');

      expect(result).toEqual({
        success: true,
        qualification: qual,
        message: 'Invitation redeemed successfully',
      });
    });

    it('should return failure when invitation is invalid', async () => {
      mockWorldFinalsService.redeemInvitation.mockResolvedValue(null);

      const result = await controller.redeemInvitation('invalid_token');

      expect(result).toEqual({
        success: false,
        message: 'Invalid or already redeemed invitation token',
      });
    });
  });

  // ============================================
  // REGISTRATION ENDPOINTS
  // ============================================

  describe('createRegistration', () => {
    it('should create registration for authenticated user', async () => {
      mockAuthSuccess();
      const reg = { id: TEST_REGISTRATION_ID };
      mockWorldFinalsService.createRegistration.mockResolvedValue(reg);
      const dto = { seasonId: TEST_SEASON_ID, division: 'Pro', competitionClass: 'SQL 1' };

      const result = await controller.createRegistration(VALID_AUTH_HEADER, dto);

      expect(result).toEqual(reg);
      expect(mockWorldFinalsService.createRegistration).toHaveBeenCalledWith(TEST_USER_ID, dto);
    });

    it('should throw when not authenticated', async () => {
      await expect(
        controller.createRegistration(undefined as any, { seasonId: TEST_SEASON_ID }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyRegistrations', () => {
    it('should return registrations for authenticated user', async () => {
      mockAuthSuccess();
      const regs = [{ id: '1' }, { id: '2' }];
      mockWorldFinalsService.getMyRegistrations.mockResolvedValue(regs);

      const result = await controller.getMyRegistrations(VALID_AUTH_HEADER);

      expect(result).toEqual(regs);
      expect(mockWorldFinalsService.getMyRegistrations).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should throw when not authenticated', async () => {
      await expect(controller.getMyRegistrations(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getMyRegistrationForSeason', () => {
    it('should return registration for user and season', async () => {
      mockAuthSuccess();
      const reg = { id: TEST_REGISTRATION_ID };
      mockWorldFinalsService.getMyRegistration.mockResolvedValue(reg);

      const result = await controller.getMyRegistrationForSeason(VALID_AUTH_HEADER, TEST_SEASON_ID);

      expect(result).toEqual(reg);
      expect(mockWorldFinalsService.getMyRegistration).toHaveBeenCalledWith(TEST_USER_ID, TEST_SEASON_ID);
    });

    it('should throw when not authenticated', async () => {
      await expect(
        controller.getMyRegistrationForSeason(undefined as any, TEST_SEASON_ID),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateRegistration', () => {
    it('should update registration for authenticated user', async () => {
      mockAuthSuccess();
      const updated = { id: TEST_REGISTRATION_ID, division: 'Amateur' };
      mockWorldFinalsService.updateRegistration.mockResolvedValue(updated);
      const dto = { division: 'Amateur' };

      const result = await controller.updateRegistration(VALID_AUTH_HEADER, TEST_REGISTRATION_ID, dto);

      expect(result).toEqual(updated);
      expect(mockWorldFinalsService.updateRegistration).toHaveBeenCalledWith(
        TEST_REGISTRATION_ID,
        TEST_USER_ID,
        dto,
      );
    });

    it('should throw when not authenticated', async () => {
      await expect(
        controller.updateRegistration(undefined as any, TEST_REGISTRATION_ID, {}),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteRegistration', () => {
    it('should delete registration for authenticated user', async () => {
      mockAuthSuccess();

      await controller.deleteRegistration(VALID_AUTH_HEADER, TEST_REGISTRATION_ID);

      expect(mockWorldFinalsService.deleteRegistration).toHaveBeenCalledWith(
        TEST_REGISTRATION_ID,
        TEST_USER_ID,
      );
    });

    it('should throw when not authenticated', async () => {
      await expect(
        controller.deleteRegistration(undefined as any, TEST_REGISTRATION_ID),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getRegistrationsBySeason', () => {
    it('should return registrations for admin', async () => {
      mockAdminAuthSuccess();
      const regs = [{ id: '1' }];
      mockWorldFinalsService.getRegistrationsBySeasonAndClass.mockResolvedValue(regs);

      const result = await controller.getRegistrationsBySeason(VALID_AUTH_HEADER, TEST_SEASON_ID, 'SQL 1');

      expect(result).toEqual(regs);
      expect(mockWorldFinalsService.getRegistrationsBySeasonAndClass).toHaveBeenCalledWith(TEST_SEASON_ID, 'SQL 1');
    });

    it('should reject non-admin users', async () => {
      mockAuthSuccess();

      await expect(
        controller.getRegistrationsBySeason(VALID_AUTH_HEADER, TEST_SEASON_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRegistrationStats', () => {
    it('should return stats for admin', async () => {
      mockAdminAuthSuccess();
      const stats = { totalRegistrations: 10 };
      mockWorldFinalsService.getRegistrationStats.mockResolvedValue(stats);

      const result = await controller.getRegistrationStats(VALID_AUTH_HEADER, TEST_SEASON_ID);

      expect(result).toEqual(stats);
      expect(mockWorldFinalsService.getRegistrationStats).toHaveBeenCalledWith(TEST_SEASON_ID);
    });

    it('should reject non-admin users', async () => {
      mockAuthSuccess();

      await expect(
        controller.getRegistrationStats(VALID_AUTH_HEADER, TEST_SEASON_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // VOTING ENDPOINTS
  // ============================================

  describe('submitVote', () => {
    it('should submit vote for authenticated user', async () => {
      mockAuthSuccess();
      const vote = { id: 'vote_1', category: 'Best Install', voteValue: 'Comp A' };
      mockWorldFinalsService.submitVote.mockResolvedValue(vote);
      const dto = { category: 'Best Install', voteValue: 'Comp A' };

      const result = await controller.submitVote(VALID_AUTH_HEADER, dto);

      expect(result).toEqual(vote);
      expect(mockWorldFinalsService.submitVote).toHaveBeenCalledWith(TEST_USER_ID, dto);
    });

    it('should throw when not authenticated', async () => {
      await expect(
        controller.submitVote(undefined as any, { category: 'Best Install', voteValue: 'A' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyVotes', () => {
    it('should return votes for authenticated user', async () => {
      mockAuthSuccess();
      const votes = [{ id: '1' }, { id: '2' }];
      mockWorldFinalsService.getMyVotes.mockResolvedValue(votes);

      const result = await controller.getMyVotes(VALID_AUTH_HEADER);

      expect(result).toEqual(votes);
      expect(mockWorldFinalsService.getMyVotes).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should throw when not authenticated', async () => {
      await expect(controller.getMyVotes(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('checkVoteStatus', () => {
    it('should return vote status for authenticated user', async () => {
      mockAuthSuccess();
      mockWorldFinalsService.hasUserVoted.mockResolvedValue(true);

      const result = await controller.checkVoteStatus(VALID_AUTH_HEADER, 'Best Install');

      expect(result).toEqual({ category: 'Best Install', hasVoted: true });
      expect(mockWorldFinalsService.hasUserVoted).toHaveBeenCalledWith(TEST_USER_ID, 'Best Install');
    });

    it('should return false when user has not voted', async () => {
      mockAuthSuccess();
      mockWorldFinalsService.hasUserVoted.mockResolvedValue(false);

      const result = await controller.checkVoteStatus(VALID_AUTH_HEADER, 'Best Sound');

      expect(result).toEqual({ category: 'Best Sound', hasVoted: false });
    });

    it('should throw when not authenticated', async () => {
      await expect(
        controller.checkVoteStatus(undefined as any, 'Best Install'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getVoteSummary', () => {
    it('should return vote summary for admin', async () => {
      mockAdminAuthSuccess();
      const summary = { totalVotes: 100, byCategory: [] };
      mockWorldFinalsService.getVoteSummary.mockResolvedValue(summary);

      const result = await controller.getVoteSummary(VALID_AUTH_HEADER);

      expect(result).toEqual(summary);
    });

    it('should reject non-admin users', async () => {
      mockAuthSuccess();

      await expect(controller.getVoteSummary(VALID_AUTH_HEADER)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getVotesByCategory', () => {
    it('should return votes by category for admin', async () => {
      mockAdminAuthSuccess();
      const votes = [{ id: '1', voteValue: 'Comp A' }];
      mockWorldFinalsService.getVotesByCategory.mockResolvedValue(votes);

      const result = await controller.getVotesByCategory(VALID_AUTH_HEADER, 'Best Install');

      expect(result).toEqual(votes);
      expect(mockWorldFinalsService.getVotesByCategory).toHaveBeenCalledWith('Best Install');
    });

    it('should reject non-admin users', async () => {
      mockAuthSuccess();

      await expect(
        controller.getVotesByCategory(VALID_AUTH_HEADER, 'Best Install'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // SERVICE ERROR PROPAGATION
  // ============================================

  describe('service error propagation', () => {
    it('should propagate service errors from createRegistration', async () => {
      mockAuthSuccess();
      mockWorldFinalsService.createRegistration.mockRejectedValue(new Error('Service error'));

      await expect(
        controller.createRegistration(VALID_AUTH_HEADER, { seasonId: TEST_SEASON_ID }),
      ).rejects.toThrow('Service error');
    });

    it('should propagate service errors from getCurrentSeasonQualifications', async () => {
      mockWorldFinalsService.getCurrentSeasonQualifications.mockRejectedValue(new Error('DB error'));

      await expect(controller.getCurrentSeasonQualifications()).rejects.toThrow('DB error');
    });

    it('should propagate NotFoundException from sendInvitation', async () => {
      mockAdminAuthSuccess();
      mockWorldFinalsService.sendInvitation.mockRejectedValue(
        new Error('Qualification not found'),
      );

      await expect(
        controller.sendInvitation(VALID_AUTH_HEADER, 'nonexistent'),
      ).rejects.toThrow('Qualification not found');
    });
  });
});
