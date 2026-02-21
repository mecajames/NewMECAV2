import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { StatesController } from '../states.controller';
import { StatesService } from '../states.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('StatesController', () => {
  let controller: StatesController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_ADMIN_ID = 'admin_456';
  const TEST_USER_ID = 'user_123';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';
  const VALID_AUTH_HEADER = 'Bearer valid_token_abc';

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
      getAllStates: jest.fn().mockResolvedValue([]),
      getDomesticStates: jest.fn().mockResolvedValue([]),
      getInternationalStates: jest.fn().mockResolvedValue([]),
      searchStates: jest.fn().mockResolvedValue([]),
      getStateByAbbreviation: jest.fn().mockResolvedValue({}),
      getStateFinalsDatesBySeasonId: jest.fn().mockResolvedValue([]),
      getStateFinalsDateByState: jest.fn().mockResolvedValue(null),
      createStateFinalsDate: jest.fn().mockResolvedValue({}),
      updateStateFinalsDate: jest.fn().mockResolvedValue({}),
      deleteStateFinalsDate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatesController],
      providers: [
        { provide: StatesService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<StatesController>(StatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ====================================================================
  // requireAdmin behavior
  // ====================================================================
  describe('requireAdmin behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(
        controller.createStateFinalsDate(undefined as any, { eventId: 'e1', stateCode: 'TX', seasonId: 's1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(
        controller.createStateFinalsDate('Basic some_token', { eventId: 'e1', stateCode: 'TX', seasonId: 's1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(
        controller.createStateFinalsDate('Bearer invalid_token', { eventId: 'e1', stateCode: 'TX', seasonId: 's1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.createStateFinalsDate(VALID_AUTH_HEADER, { eventId: 'e1', stateCode: 'TX', seasonId: 's1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================================
  // PUBLIC STATE ENDPOINTS
  // ====================================================================

  describe('getAllStates', () => {
    it('should return all states when no type filter is provided', async () => {
      const mockStates = [
        { id: '1', name: 'Texas', abbreviation: 'TX', isInternational: false },
        { id: '2', name: 'Germany', abbreviation: 'DE', isInternational: true },
      ];
      mockService.getAllStates.mockResolvedValue(mockStates);

      const result = await controller.getAllStates();

      expect(mockService.getAllStates).toHaveBeenCalledTimes(1);
      expect(mockService.getDomesticStates).not.toHaveBeenCalled();
      expect(mockService.getInternationalStates).not.toHaveBeenCalled();
      expect(result).toEqual(mockStates);
    });

    it('should return domestic states when type is "domestic"', async () => {
      const mockDomestic = [
        { id: '1', name: 'Texas', abbreviation: 'TX', isInternational: false },
      ];
      mockService.getDomesticStates.mockResolvedValue(mockDomestic);

      const result = await controller.getAllStates('domestic');

      expect(mockService.getDomesticStates).toHaveBeenCalledTimes(1);
      expect(mockService.getAllStates).not.toHaveBeenCalled();
      expect(result).toEqual(mockDomestic);
    });

    it('should return international states when type is "international"', async () => {
      const mockInternational = [
        { id: '2', name: 'Germany', abbreviation: 'DE', isInternational: true },
      ];
      mockService.getInternationalStates.mockResolvedValue(mockInternational);

      const result = await controller.getAllStates('international');

      expect(mockService.getInternationalStates).toHaveBeenCalledTimes(1);
      expect(mockService.getAllStates).not.toHaveBeenCalled();
      expect(result).toEqual(mockInternational);
    });

    it('should return an empty array when no states exist', async () => {
      mockService.getAllStates.mockResolvedValue([]);

      const result = await controller.getAllStates();

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockService.getAllStates.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllStates()).rejects.toThrow('DB error');
    });
  });

  describe('searchStates', () => {
    it('should return matching states for a valid query', async () => {
      const mockResults = [
        { id: '1', name: 'Texas', abbreviation: 'TX' },
      ];
      mockService.searchStates.mockResolvedValue(mockResults);

      const result = await controller.searchStates('tex');

      expect(mockService.searchStates).toHaveBeenCalledWith('tex');
      expect(result).toEqual(mockResults);
    });

    it('should return an empty array when query is empty', async () => {
      const result = await controller.searchStates('');

      expect(mockService.searchStates).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return an empty array when query is undefined', async () => {
      const result = await controller.searchStates(undefined as any);

      expect(mockService.searchStates).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return an empty array when query is only whitespace', async () => {
      const result = await controller.searchStates('   ');

      expect(mockService.searchStates).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockService.searchStates.mockRejectedValue(new Error('Search failed'));

      await expect(controller.searchStates('bad')).rejects.toThrow('Search failed');
    });
  });

  describe('getStateByAbbreviation', () => {
    it('should return a state by abbreviation', async () => {
      const mockState = { id: '1', name: 'Texas', abbreviation: 'TX' };
      mockService.getStateByAbbreviation.mockResolvedValue(mockState);

      const result = await controller.getStateByAbbreviation('TX');

      expect(mockService.getStateByAbbreviation).toHaveBeenCalledWith('TX');
      expect(result).toEqual(mockState);
    });

    it('should propagate NotFoundException from service', async () => {
      mockService.getStateByAbbreviation.mockRejectedValue(
        new NotFoundException('State with abbreviation ZZ not found'),
      );

      await expect(controller.getStateByAbbreviation('ZZ')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // STATE FINALS DATE ENDPOINTS (Public)
  // ====================================================================

  describe('getStateFinalsDatesBySeason', () => {
    it('should return finals dates for a season', async () => {
      const mockDates = [
        { id: '1', stateCode: 'TX', season: 's1', event: { id: 'e1' } },
        { id: '2', stateCode: 'CA', season: 's1', event: { id: 'e2' } },
      ];
      mockService.getStateFinalsDatesBySeasonId.mockResolvedValue(mockDates);

      const result = await controller.getStateFinalsDatesBySeason('s1');

      expect(mockService.getStateFinalsDatesBySeasonId).toHaveBeenCalledWith('s1');
      expect(result).toEqual(mockDates);
    });

    it('should return an empty array when no finals dates exist for the season', async () => {
      mockService.getStateFinalsDatesBySeasonId.mockResolvedValue([]);

      const result = await controller.getStateFinalsDatesBySeason('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getStateFinalsDateByState', () => {
    it('should return finals date for a specific state and season', async () => {
      const mockDate = { id: '1', stateCode: 'TX', season: 's1', event: { id: 'e1' } };
      mockService.getStateFinalsDateByState.mockResolvedValue(mockDate);

      const result = await controller.getStateFinalsDateByState('TX', 's1');

      expect(mockService.getStateFinalsDateByState).toHaveBeenCalledWith('TX', 's1');
      expect(result).toEqual(mockDate);
    });

    it('should return null when no finals date exists for the state/season combination', async () => {
      mockService.getStateFinalsDateByState.mockResolvedValue(null);

      const result = await controller.getStateFinalsDateByState('ZZ', 's1');

      expect(result).toBeNull();
    });
  });

  // ====================================================================
  // STATE FINALS DATE ENDPOINTS (Admin only)
  // ====================================================================

  describe('createStateFinalsDate', () => {
    const createDto = { eventId: 'event_1', stateCode: 'TX', seasonId: 'season_1' };

    it('should create a state finals date when admin is authenticated', async () => {
      mockAdminAuth();
      const mockCreated = { id: 'new_1', stateCode: 'TX', event: 'event_1', season: 'season_1' };
      mockService.createStateFinalsDate.mockResolvedValue(mockCreated);

      const result = await controller.createStateFinalsDate(ADMIN_AUTH_HEADER, createDto);

      expect(mockService.createStateFinalsDate).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockCreated);
    });

    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(
        controller.createStateFinalsDate(undefined as any, createDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.createStateFinalsDate).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.createStateFinalsDate(VALID_AUTH_HEADER, createDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.createStateFinalsDate).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      mockAdminAuth();
      mockService.createStateFinalsDate.mockRejectedValue(new Error('Create failed'));

      await expect(
        controller.createStateFinalsDate(ADMIN_AUTH_HEADER, createDto),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('updateStateFinalsDate', () => {
    const updateDto = { eventId: 'event_2' };

    it('should update a state finals date when admin is authenticated', async () => {
      mockAdminAuth();
      const mockUpdated = { id: 'sfd_1', stateCode: 'TX', event: 'event_2' };
      mockService.updateStateFinalsDate.mockResolvedValue(mockUpdated);

      const result = await controller.updateStateFinalsDate(ADMIN_AUTH_HEADER, 'sfd_1', updateDto);

      expect(mockService.updateStateFinalsDate).toHaveBeenCalledWith('sfd_1', updateDto);
      expect(result).toEqual(mockUpdated);
    });

    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(
        controller.updateStateFinalsDate(undefined as any, 'sfd_1', updateDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.updateStateFinalsDate).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.updateStateFinalsDate(VALID_AUTH_HEADER, 'sfd_1', updateDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.updateStateFinalsDate).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      mockAdminAuth();
      mockService.updateStateFinalsDate.mockRejectedValue(
        new NotFoundException('State finals date with ID sfd_99 not found'),
      );

      await expect(
        controller.updateStateFinalsDate(ADMIN_AUTH_HEADER, 'sfd_99', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteStateFinalsDate', () => {
    it('should delete a state finals date when admin is authenticated', async () => {
      mockAdminAuth();
      mockService.deleteStateFinalsDate.mockResolvedValue(undefined);

      await controller.deleteStateFinalsDate(ADMIN_AUTH_HEADER, 'sfd_1');

      expect(mockService.deleteStateFinalsDate).toHaveBeenCalledWith('sfd_1');
    });

    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(
        controller.deleteStateFinalsDate(undefined as any, 'sfd_1'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.deleteStateFinalsDate).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.deleteStateFinalsDate(VALID_AUTH_HEADER, 'sfd_1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.deleteStateFinalsDate).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      mockAdminAuth();
      mockService.deleteStateFinalsDate.mockRejectedValue(
        new NotFoundException('State finals date with ID sfd_99 not found'),
      );

      await expect(
        controller.deleteStateFinalsDate(ADMIN_AUTH_HEADER, 'sfd_99'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
