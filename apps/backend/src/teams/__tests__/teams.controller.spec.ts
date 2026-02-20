import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TeamsController } from '../teams.controller';
import { TeamsService } from '../teams.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';

describe('TeamsController', () => {
  let controller: TeamsController;
  let mockTeamsService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: {
    getClient: jest.Mock;
  };
  let mockGetUser: jest.Mock;

  const TEST_USER_ID = 'user_123';
  const TEST_TEAM_ID = 'team_456';
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

  beforeEach(async () => {
    mockGetUser = jest.fn();

    mockSupabaseAdmin = {
      getClient: jest.fn().mockReturnValue({
        auth: {
          getUser: mockGetUser,
        },
      }),
    };

    mockTeamsService = {
      findAll: jest.fn().mockResolvedValue([]),
      findAllPublicTeams: jest.fn().mockResolvedValue([]),
      getPublicTeamById: jest.fn().mockResolvedValue(null),
      getTeamPublicStats: jest.fn().mockResolvedValue({}),
      hasTeamMembership: jest.fn().mockResolvedValue(true),
      checkUpgradeEligibility: jest.fn().mockResolvedValue({
        canUpgrade: false,
        hasCompetitorMembership: false,
        hasTeamMembership: false,
      }),
      findByUserId: jest.fn().mockResolvedValue(null),
      findAllTeamsByUserId: jest.fn().mockResolvedValue({ ownedTeams: [], memberTeams: [] }),
      userOwnsAnyTeam: jest.fn().mockResolvedValue(false),
      getMyPendingInvites: jest.fn().mockResolvedValue([]),
      getMyPendingRequests: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: TEST_TEAM_ID, name: 'Test Team' }),
      update: jest.fn().mockResolvedValue({ id: TEST_TEAM_ID, name: 'Updated Team' }),
      delete: jest.fn().mockResolvedValue(undefined),
      addMember: jest.fn().mockResolvedValue({ id: 'member_1' }),
      removeMember: jest.fn().mockResolvedValue(undefined),
      updateMemberRole: jest.fn().mockResolvedValue({ id: 'member_1', role: 'co_owner' }),
      transferOwnership: jest.fn().mockResolvedValue({ id: TEST_TEAM_ID }),
      transferCaptaincy: jest.fn().mockResolvedValue({ id: TEST_TEAM_ID }),
      leaveTeam: jest.fn().mockResolvedValue(undefined),
      lookupMemberByMecaId: jest.fn().mockResolvedValue(null),
      inviteMember: jest.fn().mockResolvedValue({ id: 'invite_1' }),
      cancelInvite: jest.fn().mockResolvedValue(undefined),
      acceptInvite: jest.fn().mockResolvedValue({ id: 'member_1' }),
      declineInvite: jest.fn().mockResolvedValue(undefined),
      requestToJoin: jest.fn().mockResolvedValue({ id: 'request_1' }),
      cancelJoinRequest: jest.fn().mockResolvedValue(undefined),
      approveJoinRequest: jest.fn().mockResolvedValue({ id: 'member_1' }),
      rejectJoinRequest: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // PUBLIC ENDPOINTS (no auth required)
  // ====================================================================

  describe('getAllTeams', () => {
    it('should return all teams', async () => {
      const teams = [{ id: '1', name: 'Team A' }, { id: '2', name: 'Team B' }];
      mockTeamsService.findAll.mockResolvedValue(teams);

      const result = await controller.getAllTeams();

      expect(result).toEqual(teams);
      expect(mockTeamsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no teams exist', async () => {
      mockTeamsService.findAll.mockResolvedValue([]);

      const result = await controller.getAllTeams();

      expect(result).toEqual([]);
    });
  });

  describe('getPublicTeams', () => {
    it('should return all public teams', async () => {
      const publicTeams = [{ id: '1', name: 'Public Team', isPublic: true }];
      mockTeamsService.findAllPublicTeams.mockResolvedValue(publicTeams);

      const result = await controller.getPublicTeams();

      expect(result).toEqual(publicTeams);
      expect(mockTeamsService.findAllPublicTeams).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPublicTeamById', () => {
    it('should return a public team by ID', async () => {
      const team = { id: TEST_TEAM_ID, name: 'Public Team', isPublic: true };
      mockTeamsService.getPublicTeamById.mockResolvedValue(team);

      const result = await controller.getPublicTeamById(TEST_TEAM_ID);

      expect(result).toEqual(team);
      expect(mockTeamsService.getPublicTeamById).toHaveBeenCalledWith(TEST_TEAM_ID);
    });

    it('should return null when team is not found', async () => {
      mockTeamsService.getPublicTeamById.mockResolvedValue(null);

      const result = await controller.getPublicTeamById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTeamPublicStats', () => {
    it('should return team stats without seasonId', async () => {
      const stats = { totalCompetitions: 5, totalPoints: 100 };
      mockTeamsService.getTeamPublicStats.mockResolvedValue(stats);

      const result = await controller.getTeamPublicStats(TEST_TEAM_ID);

      expect(result).toEqual(stats);
      expect(mockTeamsService.getTeamPublicStats).toHaveBeenCalledWith(TEST_TEAM_ID, undefined);
    });

    it('should pass seasonId to service when provided', async () => {
      const stats = { totalCompetitions: 3 };
      mockTeamsService.getTeamPublicStats.mockResolvedValue(stats);

      const result = await controller.getTeamPublicStats(TEST_TEAM_ID, 'season_1');

      expect(result).toEqual(stats);
      expect(mockTeamsService.getTeamPublicStats).toHaveBeenCalledWith(TEST_TEAM_ID, 'season_1');
    });
  });

  describe('getTeamByUserId', () => {
    it('should return team for a given user ID', async () => {
      const team = { id: TEST_TEAM_ID, name: 'User Team' };
      mockTeamsService.findByUserId.mockResolvedValue(team);

      const result = await controller.getTeamByUserId('some_user');

      expect(result).toEqual(team);
      expect(mockTeamsService.findByUserId).toHaveBeenCalledWith('some_user');
    });
  });

  describe('lookupMember', () => {
    it('should return found member data when MECA ID matches', async () => {
      const member = { id: 'user_1', first_name: 'John', meca_id: 'MECA001', canInvite: true };
      mockTeamsService.lookupMemberByMecaId.mockResolvedValue(member);

      const result = await controller.lookupMember({ meca_id: 'MECA001' });

      expect(result).toEqual({ found: true, member });
      expect(mockTeamsService.lookupMemberByMecaId).toHaveBeenCalledWith('MECA001');
    });

    it('should return not-found response when MECA ID does not match', async () => {
      mockTeamsService.lookupMemberByMecaId.mockResolvedValue(null);

      const result = await controller.lookupMember({ meca_id: 'NONEXISTENT' });

      expect(result).toEqual({ found: false, message: 'No member found with this MECA ID' });
    });
  });

  // ====================================================================
  // AUTH HELPER (requireAuth) - tested through endpoints
  // ====================================================================

  describe('requireAuth behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.getMyTeam(undefined as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.getMyTeam('Basic some_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.getMyTeam('Bearer invalid_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should extract token correctly and call getUser', async () => {
      mockAuthSuccess();

      await controller.getMyTeam(VALID_AUTH_HEADER);

      expect(mockGetUser).toHaveBeenCalledWith('valid_token_abc');
    });
  });

  // ====================================================================
  // AUTHENTICATED ENDPOINTS
  // ====================================================================

  describe('canCreateTeam', () => {
    it('should return canCreate true when user has team membership', async () => {
      mockAuthSuccess();
      mockTeamsService.hasTeamMembership.mockResolvedValue(true);

      const result = await controller.canCreateTeam(VALID_AUTH_HEADER);

      expect(result).toEqual({ canCreate: true, reason: undefined });
      expect(mockTeamsService.hasTeamMembership).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return canCreate false with reason when user lacks team membership', async () => {
      mockAuthSuccess();
      mockTeamsService.hasTeamMembership.mockResolvedValue(false);

      const result = await controller.canCreateTeam(VALID_AUTH_HEADER);

      expect(result).toEqual({
        canCreate: false,
        reason: 'Team membership required to create a team',
      });
    });

    it('should return canCreate false when not authenticated (catches auth error)', async () => {
      const result = await controller.canCreateTeam(undefined as any);

      expect(result).toEqual({ canCreate: false, reason: 'Not authenticated' });
    });
  });

  describe('canUpgradeToTeam', () => {
    it('should return upgrade eligibility for authenticated user', async () => {
      mockAuthSuccess();
      const eligibility = {
        canUpgrade: true,
        hasCompetitorMembership: true,
        hasTeamMembership: false,
      };
      mockTeamsService.checkUpgradeEligibility.mockResolvedValue(eligibility);

      const result = await controller.canUpgradeToTeam(VALID_AUTH_HEADER);

      expect(result).toEqual(eligibility);
      expect(mockTeamsService.checkUpgradeEligibility).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return defaults when not authenticated', async () => {
      const result = await controller.canUpgradeToTeam(undefined as any);

      expect(result).toEqual({
        canUpgrade: false,
        hasCompetitorMembership: false,
        hasTeamMembership: false,
        reason: 'Not authenticated',
      });
    });
  });

  describe('getMyTeam', () => {
    it('should return the team for the authenticated user', async () => {
      mockAuthSuccess();
      const team = { id: TEST_TEAM_ID, name: 'My Team' };
      mockTeamsService.findByUserId.mockResolvedValue(team);

      const result = await controller.getMyTeam(VALID_AUTH_HEADER);

      expect(result).toEqual(team);
      expect(mockTeamsService.findByUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return null when user has no team', async () => {
      mockAuthSuccess();
      mockTeamsService.findByUserId.mockResolvedValue(null);

      const result = await controller.getMyTeam(VALID_AUTH_HEADER);

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getMyTeam(undefined as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyTeams', () => {
    it('should return owned and member teams for authenticated user', async () => {
      mockAuthSuccess();
      const teams = {
        ownedTeams: [{ id: '1', name: 'Owned Team' }],
        memberTeams: [{ id: '2', name: 'Member Team' }],
      };
      mockTeamsService.findAllTeamsByUserId.mockResolvedValue(teams);

      const result = await controller.getMyTeams(VALID_AUTH_HEADER);

      expect(result).toEqual(teams);
      expect(mockTeamsService.findAllTeamsByUserId).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getMyTeams(undefined as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('ownsTeam', () => {
    it('should return ownsTeam true when user owns a team', async () => {
      mockAuthSuccess();
      mockTeamsService.userOwnsAnyTeam.mockResolvedValue(true);

      const result = await controller.ownsTeam(VALID_AUTH_HEADER);

      expect(result).toEqual({ ownsTeam: true });
      expect(mockTeamsService.userOwnsAnyTeam).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return ownsTeam false when user does not own a team', async () => {
      mockAuthSuccess();
      mockTeamsService.userOwnsAnyTeam.mockResolvedValue(false);

      const result = await controller.ownsTeam(VALID_AUTH_HEADER);

      expect(result).toEqual({ ownsTeam: false });
    });

    it('should return ownsTeam false when not authenticated (catches error)', async () => {
      const result = await controller.ownsTeam(undefined as any);

      expect(result).toEqual({ ownsTeam: false });
    });
  });

  describe('getMyPendingInvites', () => {
    it('should return pending invites for authenticated user', async () => {
      mockAuthSuccess();
      const invites = [{ id: 'inv_1', teamId: TEST_TEAM_ID, status: 'pending_invite' }];
      mockTeamsService.getMyPendingInvites.mockResolvedValue(invites);

      const result = await controller.getMyPendingInvites(VALID_AUTH_HEADER);

      expect(result).toEqual(invites);
      expect(mockTeamsService.getMyPendingInvites).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getMyPendingInvites(undefined as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyPendingRequests', () => {
    it('should return pending requests for authenticated user', async () => {
      mockAuthSuccess();
      const requests = [{ id: 'req_1', teamId: TEST_TEAM_ID, status: 'pending_approval' }];
      mockTeamsService.getMyPendingRequests.mockResolvedValue(requests);

      const result = await controller.getMyPendingRequests(VALID_AUTH_HEADER);

      expect(result).toEqual(requests);
      expect(mockTeamsService.getMyPendingRequests).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getMyPendingRequests(undefined as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getTeam', () => {
    it('should return team with userId when authenticated', async () => {
      mockAuthSuccess();
      const team = { id: TEST_TEAM_ID, name: 'Team' };
      mockTeamsService.findById.mockResolvedValue(team);

      const result = await controller.getTeam(TEST_TEAM_ID, VALID_AUTH_HEADER);

      expect(result).toEqual(team);
      expect(mockTeamsService.findById).toHaveBeenCalledWith(TEST_TEAM_ID, TEST_USER_ID);
    });

    it('should return team without userId when not authenticated (optional auth)', async () => {
      mockAuthFailure();
      const team = { id: TEST_TEAM_ID, name: 'Team' };
      mockTeamsService.findById.mockResolvedValue(team);

      const result = await controller.getTeam(TEST_TEAM_ID, 'Bearer bad_token');

      expect(result).toEqual(team);
      expect(mockTeamsService.findById).toHaveBeenCalledWith(TEST_TEAM_ID);
    });

    it('should call findById without userId when no auth header provided', async () => {
      const team = { id: TEST_TEAM_ID, name: 'Team' };
      mockTeamsService.findById.mockResolvedValue(team);

      const result = await controller.getTeam(TEST_TEAM_ID, undefined as any);

      expect(result).toEqual(team);
      expect(mockTeamsService.findById).toHaveBeenCalledWith(TEST_TEAM_ID);
    });
  });

  // ====================================================================
  // TEAM CRUD
  // ====================================================================

  describe('createTeam', () => {
    const createDto = {
      name: 'New Team',
      description: 'A great team',
      bio: 'Team bio',
      logo_url: 'https://example.com/logo.png',
      season_id: 'season_1',
      team_type: 'competitive',
      location: 'Austin, TX',
      max_members: 10,
      website: 'https://example.com',
      is_public: true,
      requires_approval: false,
      gallery_images: ['img1.png', 'img2.png'],
    };

    it('should create a team with snake_case DTO transformed to camelCase', async () => {
      mockAuthSuccess();
      const createdTeam = { id: TEST_TEAM_ID, name: 'New Team' };
      mockTeamsService.create.mockResolvedValue(createdTeam);

      const result = await controller.createTeam(createDto, VALID_AUTH_HEADER);

      expect(result).toEqual(createdTeam);
      expect(mockTeamsService.create).toHaveBeenCalledWith(
        {
          name: 'New Team',
          description: 'A great team',
          bio: 'Team bio',
          logoUrl: 'https://example.com/logo.png',
          seasonId: 'season_1',
          teamType: 'competitive',
          location: 'Austin, TX',
          maxMembers: 10,
          website: 'https://example.com',
          isPublic: true,
          requiresApproval: false,
          galleryImages: ['img1.png', 'img2.png'],
        },
        TEST_USER_ID,
      );
    });

    it('should handle partial DTO with only required fields', async () => {
      mockAuthSuccess();
      const minimalDto = { name: 'Minimal Team' };
      mockTeamsService.create.mockResolvedValue({ id: TEST_TEAM_ID, name: 'Minimal Team' });

      await controller.createTeam(minimalDto, VALID_AUTH_HEADER);

      expect(mockTeamsService.create).toHaveBeenCalledWith(
        {
          name: 'Minimal Team',
          description: undefined,
          bio: undefined,
          logoUrl: undefined,
          seasonId: undefined,
          teamType: undefined,
          location: undefined,
          maxMembers: undefined,
          website: undefined,
          isPublic: undefined,
          requiresApproval: undefined,
          galleryImages: undefined,
        },
        TEST_USER_ID,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.createTeam(createDto, undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockTeamsService.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTeam', () => {
    const updateDto = {
      name: 'Updated Team',
      description: 'Updated description',
      bio: 'Updated bio',
      logo_url: 'https://example.com/new-logo.png',
      team_type: 'casual',
      location: 'Dallas, TX',
      max_members: 20,
      website: 'https://updated.com',
      is_public: false,
      requires_approval: true,
      gallery_images: ['new_img.png'],
      cover_image_position: { x: 50, y: 30 },
    };

    it('should update team with snake_case DTO transformed to camelCase', async () => {
      mockAuthSuccess();
      const updatedTeam = { id: TEST_TEAM_ID, name: 'Updated Team' };
      mockTeamsService.update.mockResolvedValue(updatedTeam);

      const result = await controller.updateTeam(TEST_TEAM_ID, updateDto, VALID_AUTH_HEADER);

      expect(result).toEqual(updatedTeam);
      expect(mockTeamsService.update).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        {
          name: 'Updated Team',
          description: 'Updated description',
          bio: 'Updated bio',
          logoUrl: 'https://example.com/new-logo.png',
          teamType: 'casual',
          location: 'Dallas, TX',
          maxMembers: 20,
          website: 'https://updated.com',
          isPublic: false,
          requiresApproval: true,
          galleryImages: ['new_img.png'],
          coverImagePosition: { x: 50, y: 30 },
        },
        TEST_USER_ID,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.updateTeam(TEST_TEAM_ID, updateDto, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTeam', () => {
    it('should delete team for authenticated user', async () => {
      mockAuthSuccess();

      await controller.deleteTeam(TEST_TEAM_ID, VALID_AUTH_HEADER);

      expect(mockTeamsService.delete).toHaveBeenCalledWith(TEST_TEAM_ID, TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.deleteTeam(TEST_TEAM_ID, undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockTeamsService.delete).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // MEMBER MANAGEMENT
  // ====================================================================

  describe('addMember', () => {
    it('should add a member to the team', async () => {
      mockAuthSuccess();
      const memberResult = { id: 'member_1', teamId: TEST_TEAM_ID, userId: 'new_user' };
      mockTeamsService.addMember.mockResolvedValue(memberResult);

      const result = await controller.addMember(TEST_TEAM_ID, { user_id: 'new_user' }, VALID_AUTH_HEADER);

      expect(result).toEqual(memberResult);
      expect(mockTeamsService.addMember).toHaveBeenCalledWith(TEST_TEAM_ID, 'new_user', TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.addMember(TEST_TEAM_ID, { user_id: 'new_user' }, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.addMember).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    const memberId = 'member_to_remove';

    it('should remove a member from the team', async () => {
      mockAuthSuccess();

      await controller.removeMember(TEST_TEAM_ID, memberId, VALID_AUTH_HEADER);

      expect(mockTeamsService.removeMember).toHaveBeenCalledWith(TEST_TEAM_ID, memberId, TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.removeMember(TEST_TEAM_ID, memberId, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.removeMember).not.toHaveBeenCalled();
    });
  });

  describe('updateMemberRole', () => {
    const memberId = 'member_1';

    it('should update a member role', async () => {
      mockAuthSuccess();
      const updated = { id: memberId, role: 'co_owner' };
      mockTeamsService.updateMemberRole.mockResolvedValue(updated);

      const result = await controller.updateMemberRole(
        TEST_TEAM_ID,
        memberId,
        { role: 'co_owner' as any },
        VALID_AUTH_HEADER,
      );

      expect(result).toEqual(updated);
      expect(mockTeamsService.updateMemberRole).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        memberId,
        'co_owner',
        TEST_USER_ID,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.updateMemberRole(TEST_TEAM_ID, memberId, { role: 'member' as any }, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.updateMemberRole).not.toHaveBeenCalled();
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership to new owner', async () => {
      mockAuthSuccess();
      const updatedTeam = { id: TEST_TEAM_ID, captainId: 'new_owner' };
      mockTeamsService.transferOwnership.mockResolvedValue(updatedTeam);

      const result = await controller.transferOwnership(
        TEST_TEAM_ID,
        { new_owner_id: 'new_owner' },
        VALID_AUTH_HEADER,
      );

      expect(result).toEqual(updatedTeam);
      expect(mockTeamsService.transferOwnership).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        'new_owner',
        TEST_USER_ID,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.transferOwnership(TEST_TEAM_ID, { new_owner_id: 'new_owner' }, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.transferOwnership).not.toHaveBeenCalled();
    });
  });

  describe('transferCaptaincy (backward compat)', () => {
    it('should transfer captaincy to new captain', async () => {
      mockAuthSuccess();
      const updatedTeam = { id: TEST_TEAM_ID };
      mockTeamsService.transferCaptaincy.mockResolvedValue(updatedTeam);

      const result = await controller.transferCaptaincy(
        TEST_TEAM_ID,
        { new_captain_id: 'new_captain' },
        VALID_AUTH_HEADER,
      );

      expect(result).toEqual(updatedTeam);
      expect(mockTeamsService.transferCaptaincy).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        'new_captain',
        TEST_USER_ID,
      );
    });
  });

  describe('leaveTeam', () => {
    it('should allow authenticated user to leave their team', async () => {
      mockAuthSuccess();

      await controller.leaveTeam(VALID_AUTH_HEADER);

      expect(mockTeamsService.leaveTeam).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.leaveTeam(undefined as any)).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.leaveTeam).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // INVITE SYSTEM
  // ====================================================================

  describe('inviteMember', () => {
    it('should invite a member with a message', async () => {
      mockAuthSuccess();
      const invite = { id: 'invite_1', status: 'pending_invite' };
      mockTeamsService.inviteMember.mockResolvedValue(invite);

      const result = await controller.inviteMember(
        TEST_TEAM_ID,
        { user_id: 'target_user', message: 'Join us!' },
        VALID_AUTH_HEADER,
      );

      expect(result).toEqual(invite);
      expect(mockTeamsService.inviteMember).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        'target_user',
        TEST_USER_ID,
        'Join us!',
      );
    });

    it('should invite a member without a message', async () => {
      mockAuthSuccess();
      mockTeamsService.inviteMember.mockResolvedValue({ id: 'invite_1' });

      await controller.inviteMember(
        TEST_TEAM_ID,
        { user_id: 'target_user' },
        VALID_AUTH_HEADER,
      );

      expect(mockTeamsService.inviteMember).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        'target_user',
        TEST_USER_ID,
        undefined,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.inviteMember(TEST_TEAM_ID, { user_id: 'target_user' }, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.inviteMember).not.toHaveBeenCalled();
    });
  });

  describe('cancelInvite', () => {
    it('should cancel a pending invite', async () => {
      mockAuthSuccess();

      await controller.cancelInvite(TEST_TEAM_ID, 'invitee_user', VALID_AUTH_HEADER);

      expect(mockTeamsService.cancelInvite).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        'invitee_user',
        TEST_USER_ID,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.cancelInvite(TEST_TEAM_ID, 'invitee_user', undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.cancelInvite).not.toHaveBeenCalled();
    });
  });

  describe('acceptInvite', () => {
    it('should accept an invite for authenticated user', async () => {
      mockAuthSuccess();
      const member = { id: 'member_1', status: 'active' };
      mockTeamsService.acceptInvite.mockResolvedValue(member);

      const result = await controller.acceptInvite(TEST_TEAM_ID, VALID_AUTH_HEADER);

      expect(result).toEqual(member);
      expect(mockTeamsService.acceptInvite).toHaveBeenCalledWith(TEST_TEAM_ID, TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.acceptInvite(TEST_TEAM_ID, undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockTeamsService.acceptInvite).not.toHaveBeenCalled();
    });
  });

  describe('declineInvite', () => {
    it('should decline an invite for authenticated user', async () => {
      mockAuthSuccess();

      await controller.declineInvite(TEST_TEAM_ID, VALID_AUTH_HEADER);

      expect(mockTeamsService.declineInvite).toHaveBeenCalledWith(TEST_TEAM_ID, TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.declineInvite(TEST_TEAM_ID, undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockTeamsService.declineInvite).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // JOIN REQUEST SYSTEM
  // ====================================================================

  describe('requestToJoin', () => {
    it('should create a join request with a message', async () => {
      mockAuthSuccess();
      const request = { id: 'request_1', status: 'pending_approval' };
      mockTeamsService.requestToJoin.mockResolvedValue(request);

      const result = await controller.requestToJoin(
        TEST_TEAM_ID,
        { message: 'I want to join!' },
        VALID_AUTH_HEADER,
      );

      expect(result).toEqual(request);
      expect(mockTeamsService.requestToJoin).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        TEST_USER_ID,
        'I want to join!',
      );
    });

    it('should create a join request without a message', async () => {
      mockAuthSuccess();
      mockTeamsService.requestToJoin.mockResolvedValue({ id: 'request_1' });

      await controller.requestToJoin(TEST_TEAM_ID, {}, VALID_AUTH_HEADER);

      expect(mockTeamsService.requestToJoin).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        TEST_USER_ID,
        undefined,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.requestToJoin(TEST_TEAM_ID, {}, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.requestToJoin).not.toHaveBeenCalled();
    });
  });

  describe('cancelJoinRequest', () => {
    it('should cancel a pending join request', async () => {
      mockAuthSuccess();

      await controller.cancelJoinRequest(TEST_TEAM_ID, VALID_AUTH_HEADER);

      expect(mockTeamsService.cancelJoinRequest).toHaveBeenCalledWith(TEST_TEAM_ID, TEST_USER_ID);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.cancelJoinRequest(TEST_TEAM_ID, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.cancelJoinRequest).not.toHaveBeenCalled();
    });
  });

  describe('approveJoinRequest', () => {
    const requesterId = 'requester_user';

    it('should approve a join request', async () => {
      mockAuthSuccess();
      const member = { id: 'member_1', status: 'active' };
      mockTeamsService.approveJoinRequest.mockResolvedValue(member);

      const result = await controller.approveJoinRequest(
        TEST_TEAM_ID,
        requesterId,
        VALID_AUTH_HEADER,
      );

      expect(result).toEqual(member);
      expect(mockTeamsService.approveJoinRequest).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        requesterId,
        TEST_USER_ID,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.approveJoinRequest(TEST_TEAM_ID, requesterId, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.approveJoinRequest).not.toHaveBeenCalled();
    });
  });

  describe('rejectJoinRequest', () => {
    const requesterId = 'requester_user';

    it('should reject a join request', async () => {
      mockAuthSuccess();

      await controller.rejectJoinRequest(TEST_TEAM_ID, requesterId, VALID_AUTH_HEADER);

      expect(mockTeamsService.rejectJoinRequest).toHaveBeenCalledWith(
        TEST_TEAM_ID,
        requesterId,
        TEST_USER_ID,
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.rejectJoinRequest(TEST_TEAM_ID, requesterId, undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockTeamsService.rejectJoinRequest).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate service errors from createTeam', async () => {
      mockAuthSuccess();
      mockTeamsService.create.mockRejectedValue(new Error('Service error'));

      await expect(controller.createTeam({ name: 'Test' }, VALID_AUTH_HEADER)).rejects.toThrow(
        'Service error',
      );
    });

    it('should propagate service errors from deleteTeam', async () => {
      mockAuthSuccess();
      mockTeamsService.delete.mockRejectedValue(new Error('Forbidden'));

      await expect(controller.deleteTeam(TEST_TEAM_ID, VALID_AUTH_HEADER)).rejects.toThrow(
        'Forbidden',
      );
    });

    it('should propagate service errors from findAll', async () => {
      mockTeamsService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllTeams()).rejects.toThrow('DB error');
    });
  });
});
