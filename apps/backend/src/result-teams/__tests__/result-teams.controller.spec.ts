import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ResultTeamsController } from '../result-teams.controller';
import { ResultTeamsService } from '../result-teams.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('ResultTeamsController', () => {
  let controller: ResultTeamsController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_USER_ID = 'user_123';
  const TEST_ADMIN_ID = 'admin_456';
  const TEST_RESULT_TEAM_ID = 'rt_789';
  const TEST_RESULT_ID = 'result_111';
  const TEST_TEAM_ID = 'team_222';
  const TEST_SEASON_ID = 'season_333';
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
      getResultTeamsByResultId: jest.fn().mockResolvedValue([]),
      getResultTeamsByTeamId: jest.fn().mockResolvedValue([]),
      getTeamResultsForSeason: jest.fn().mockResolvedValue([]),
      getTopTeamsBySeason: jest.fn().mockResolvedValue([]),
      getTeamPointsForSeason: jest.fn().mockResolvedValue(0),
      createResultTeam: jest.fn().mockResolvedValue({ id: TEST_RESULT_TEAM_ID }),
      deleteResultTeam: jest.fn().mockResolvedValue(undefined),
      getAllTeamsWithMembers: jest.fn().mockResolvedValue([]),
      syncAllResultsToTeams: jest.fn().mockResolvedValue({ processed: 0, linked: 0, errors: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultTeamsController],
      providers: [
        { provide: ResultTeamsService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<ResultTeamsController>(ResultTeamsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // AUTH / ADMIN BEHAVIOR
  // ====================================================================

  describe('requireAdmin behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(
        controller.createResultTeam(undefined as any, { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(
        controller.createResultTeam('Basic some_token', { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(
        controller.createResultTeam('Bearer invalid_token', { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.createResultTeam(VALID_AUTH_HEADER, { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when profile is not found', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      });
      (mockEm.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.createResultTeam(VALID_AUTH_HEADER, { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed when user has admin role', async () => {
      mockAdminAuth();
      const created = { id: TEST_RESULT_TEAM_ID };
      mockService.createResultTeam.mockResolvedValue(created);

      const result = await controller.createResultTeam(
        ADMIN_AUTH_HEADER,
        { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID },
      );

      expect(result).toEqual(created);
    });
  });

  // ====================================================================
  // PUBLIC ENDPOINTS
  // ====================================================================

  describe('getResultTeamsByResult', () => {
    it('should return result teams for a given result ID', async () => {
      const resultTeams = [
        { id: 'rt_1', result: TEST_RESULT_ID, team: TEST_TEAM_ID },
        { id: 'rt_2', result: TEST_RESULT_ID, team: 'team_other' },
      ];
      mockService.getResultTeamsByResultId.mockResolvedValue(resultTeams);

      const result = await controller.getResultTeamsByResult(TEST_RESULT_ID);

      expect(result).toEqual(resultTeams);
      expect(mockService.getResultTeamsByResultId).toHaveBeenCalledWith(TEST_RESULT_ID);
    });

    it('should return an empty array when no result teams exist for result', async () => {
      mockService.getResultTeamsByResultId.mockResolvedValue([]);

      const result = await controller.getResultTeamsByResult(TEST_RESULT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getResultTeamsByTeam', () => {
    it('should return result teams for a given team ID', async () => {
      const resultTeams = [
        { id: 'rt_1', result: 'result_a', team: TEST_TEAM_ID },
      ];
      mockService.getResultTeamsByTeamId.mockResolvedValue(resultTeams);

      const result = await controller.getResultTeamsByTeam(TEST_TEAM_ID);

      expect(result).toEqual(resultTeams);
      expect(mockService.getResultTeamsByTeamId).toHaveBeenCalledWith(TEST_TEAM_ID);
    });

    it('should return an empty array when no result teams exist for team', async () => {
      mockService.getResultTeamsByTeamId.mockResolvedValue([]);

      const result = await controller.getResultTeamsByTeam(TEST_TEAM_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getTeamResultsForSeason', () => {
    it('should return result teams for a team in a specific season', async () => {
      const resultTeams = [
        { id: 'rt_1', result: 'result_a', team: TEST_TEAM_ID },
      ];
      mockService.getTeamResultsForSeason.mockResolvedValue(resultTeams);

      const result = await controller.getTeamResultsForSeason(TEST_TEAM_ID, TEST_SEASON_ID);

      expect(result).toEqual(resultTeams);
      expect(mockService.getTeamResultsForSeason).toHaveBeenCalledWith(TEST_TEAM_ID, TEST_SEASON_ID);
    });

    it('should return an empty array when no results exist for team in season', async () => {
      mockService.getTeamResultsForSeason.mockResolvedValue([]);

      const result = await controller.getTeamResultsForSeason(TEST_TEAM_ID, TEST_SEASON_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getTeamStandings', () => {
    it('should return team standings for a season with default limit', async () => {
      const standings = [
        { teamId: 'team_1', totalPoints: 200 },
        { teamId: 'team_2', totalPoints: 150 },
      ];
      mockService.getTopTeamsBySeason.mockResolvedValue(standings);

      const result = await controller.getTeamStandings(TEST_SEASON_ID);

      expect(result).toEqual(standings);
      expect(mockService.getTopTeamsBySeason).toHaveBeenCalledWith(TEST_SEASON_ID, 10);
    });

    it('should pass custom limit when provided', async () => {
      mockService.getTopTeamsBySeason.mockResolvedValue([]);

      await controller.getTeamStandings(TEST_SEASON_ID, 5);

      expect(mockService.getTopTeamsBySeason).toHaveBeenCalledWith(TEST_SEASON_ID, 5);
    });

    it('should use default limit of 10 when limit is 0 (falsy)', async () => {
      mockService.getTopTeamsBySeason.mockResolvedValue([]);

      await controller.getTeamStandings(TEST_SEASON_ID, 0);

      expect(mockService.getTopTeamsBySeason).toHaveBeenCalledWith(TEST_SEASON_ID, 10);
    });
  });

  describe('getTeamPointsForSeason', () => {
    it('should return total points for a team in a season', async () => {
      mockService.getTeamPointsForSeason.mockResolvedValue(150);

      const result = await controller.getTeamPointsForSeason(TEST_TEAM_ID, TEST_SEASON_ID);

      expect(result).toEqual({
        teamId: TEST_TEAM_ID,
        seasonId: TEST_SEASON_ID,
        totalPoints: 150,
      });
      expect(mockService.getTeamPointsForSeason).toHaveBeenCalledWith(TEST_TEAM_ID, TEST_SEASON_ID);
    });

    it('should return 0 points when team has no results in the season', async () => {
      mockService.getTeamPointsForSeason.mockResolvedValue(0);

      const result = await controller.getTeamPointsForSeason(TEST_TEAM_ID, TEST_SEASON_ID);

      expect(result).toEqual({
        teamId: TEST_TEAM_ID,
        seasonId: TEST_SEASON_ID,
        totalPoints: 0,
      });
    });
  });

  // ====================================================================
  // ADMIN ENDPOINTS
  // ====================================================================

  describe('createResultTeam (admin)', () => {
    it('should create a result team entry', async () => {
      mockAdminAuth();
      const dto = { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID, memberId: 'member_1' };
      const created = { id: TEST_RESULT_TEAM_ID, ...dto };
      mockService.createResultTeam.mockResolvedValue(created);

      const result = await controller.createResultTeam(ADMIN_AUTH_HEADER, dto);

      expect(result).toEqual(created);
      expect(mockService.createResultTeam).toHaveBeenCalledWith(dto);
    });

    it('should create a result team entry without memberId', async () => {
      mockAdminAuth();
      const dto = { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID };
      const created = { id: TEST_RESULT_TEAM_ID, ...dto };
      mockService.createResultTeam.mockResolvedValue(created);

      const result = await controller.createResultTeam(ADMIN_AUTH_HEADER, dto);

      expect(result).toEqual(created);
      expect(mockService.createResultTeam).toHaveBeenCalledWith(dto);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.createResultTeam(VALID_AUTH_HEADER, { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.createResultTeam).not.toHaveBeenCalled();
    });
  });

  describe('deleteResultTeam (admin)', () => {
    it('should delete a result team entry', async () => {
      mockAdminAuth();

      await controller.deleteResultTeam(ADMIN_AUTH_HEADER, TEST_RESULT_TEAM_ID);

      expect(mockService.deleteResultTeam).toHaveBeenCalledWith(TEST_RESULT_TEAM_ID);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.deleteResultTeam(VALID_AUTH_HEADER, TEST_RESULT_TEAM_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.deleteResultTeam).not.toHaveBeenCalled();
    });
  });

  describe('getAllTeamsWithMembers (admin)', () => {
    it('should return all teams with members for admin', async () => {
      mockAdminAuth();
      const teamsWithMembers = [
        {
          teamId: TEST_TEAM_ID,
          teamName: 'Test Team',
          memberCount: 2,
          members: [
            { userId: 'user_1', mecaId: 'MECA001', name: 'John Doe', role: 'captain' },
            { userId: 'user_2', mecaId: 'MECA002', name: 'Jane Smith', role: 'member' },
          ],
        },
      ];
      mockService.getAllTeamsWithMembers.mockResolvedValue(teamsWithMembers);

      const result = await controller.getAllTeamsWithMembers(ADMIN_AUTH_HEADER);

      expect(result).toEqual(teamsWithMembers);
      expect(mockService.getAllTeamsWithMembers).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getAllTeamsWithMembers(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.getAllTeamsWithMembers).not.toHaveBeenCalled();
    });
  });

  describe('syncAllResultsToTeams (admin)', () => {
    it('should sync all results to teams', async () => {
      mockAdminAuth();
      const syncResult = { processed: 100, linked: 25, errors: 2 };
      mockService.syncAllResultsToTeams.mockResolvedValue(syncResult);

      const result = await controller.syncAllResultsToTeams(ADMIN_AUTH_HEADER);

      expect(result).toEqual(syncResult);
      expect(mockService.syncAllResultsToTeams).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.syncAllResultsToTeams(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.syncAllResultsToTeams).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from getResultTeamsByResultId', async () => {
      mockService.getResultTeamsByResultId.mockRejectedValue(new Error('DB error'));

      await expect(controller.getResultTeamsByResult(TEST_RESULT_ID)).rejects.toThrow('DB error');
    });

    it('should propagate errors from getResultTeamsByTeamId', async () => {
      mockService.getResultTeamsByTeamId.mockRejectedValue(new Error('Connection error'));

      await expect(controller.getResultTeamsByTeam(TEST_TEAM_ID)).rejects.toThrow('Connection error');
    });

    it('should propagate errors from createResultTeam', async () => {
      mockAdminAuth();
      mockService.createResultTeam.mockRejectedValue(new Error('Create failed'));

      await expect(
        controller.createResultTeam(ADMIN_AUTH_HEADER, { resultId: TEST_RESULT_ID, teamId: TEST_TEAM_ID }),
      ).rejects.toThrow('Create failed');
    });

    it('should propagate errors from deleteResultTeam', async () => {
      mockAdminAuth();
      mockService.deleteResultTeam.mockRejectedValue(new Error('Not found'));

      await expect(
        controller.deleteResultTeam(ADMIN_AUTH_HEADER, 'nonexistent'),
      ).rejects.toThrow('Not found');
    });

    it('should propagate errors from syncAllResultsToTeams', async () => {
      mockAdminAuth();
      mockService.syncAllResultsToTeams.mockRejectedValue(new Error('Sync failed'));

      await expect(
        controller.syncAllResultsToTeams(ADMIN_AUTH_HEADER),
      ).rejects.toThrow('Sync failed');
    });
  });
});
