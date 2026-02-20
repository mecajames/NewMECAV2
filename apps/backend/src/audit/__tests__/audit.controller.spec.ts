import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuditController } from '../audit.controller';
import { AuditService } from '../audit.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole } from '@newmeca/shared';

describe('AuditController', () => {
  let controller: AuditController;
  let mockService: Record<string, jest.Mock>;
  let mockSupabaseAdmin: { getClient: jest.Mock };
  let mockGetUser: jest.Mock;
  let mockEm: ReturnType<typeof createMockEntityManager>;

  const TEST_ADMIN_ID = 'admin_123';
  const TEST_USER_ID = 'user_456';
  const TEST_EVENT_ID = 'event_789';
  const TEST_LOG_ID = 'log_abc';
  const TEST_SESSION_ID = 'session_def';
  const ADMIN_AUTH_HEADER = 'Bearer admin_token_xyz';
  const USER_AUTH_HEADER = 'Bearer user_token_abc';

  const mockAuditLog = {
    id: TEST_LOG_ID,
    session_id: TEST_SESSION_ID,
    result_id: 'result_123',
    action: 'create',
    old_data: null,
    new_data: { competitorName: 'John Doe', score: 95 },
    timestamp: new Date(),
    user_id: TEST_ADMIN_ID,
    user_email: 'admin@example.com',
  };

  const mockSession = {
    id: TEST_SESSION_ID,
    eventId: TEST_EVENT_ID,
    userId: TEST_ADMIN_ID,
    entryMethod: 'manual',
    format: 'SPL',
    resultCount: 5,
    sessionStart: new Date(),
  };

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
      getAllSessions: jest.fn().mockResolvedValue({ sessions: [], total: 0 }),
      getAllActivity: jest.fn().mockResolvedValue({ activities: [], total: 0, stats: { newEntries: 0, modifications: 0, deletions: 0 } }),
      getEventSessions: jest.fn().mockResolvedValue([]),
      getEventModifications: jest.fn().mockResolvedValue([]),
      getEventDeletions: jest.fn().mockResolvedValue([]),
      getEventAllLogs: jest.fn().mockResolvedValue({ imports: [], modifications: [], deletions: [] }),
      getAuditLogById: jest.fn().mockResolvedValue(null),
      getSessionAuditLogs: jest.fn().mockResolvedValue([]),
      getSessionFilePath: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: 'EntityManager', useValue: mockEm },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // requireAdmin behavior
  // ====================================================================

  describe('requireAdmin behavior', () => {
    it('should throw UnauthorizedException when no auth header is provided', async () => {
      await expect(controller.getAllSessions(undefined as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(controller.getAllSessions('Basic token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(controller.getAllSessions('Bearer bad_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.getAllSessions(USER_AUTH_HEADER)).rejects.toThrow(ForbiddenException);
    });

    it('should succeed when user has admin role', async () => {
      mockAdminAuth();

      const result = await controller.getAllSessions(ADMIN_AUTH_HEADER);

      expect(result).toEqual({ sessions: [], total: 0 });
    });
  });

  // ====================================================================
  // Admin-protected Endpoints
  // ====================================================================

  describe('getAllSessions', () => {
    it('should return all sessions with default parameters', async () => {
      mockAdminAuth();
      const mockResult = { sessions: [mockSession], total: 1 };
      mockService.getAllSessions.mockResolvedValue(mockResult);

      const result = await controller.getAllSessions(ADMIN_AUTH_HEADER);

      expect(result).toEqual(mockResult);
      expect(mockService.getAllSessions).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        eventId: undefined,
        search: undefined,
      });
    });

    it('should pass through query parameters', async () => {
      mockAdminAuth();
      mockService.getAllSessions.mockResolvedValue({ sessions: [], total: 0 });

      await controller.getAllSessions(ADMIN_AUTH_HEADER, '50', '10', TEST_EVENT_ID, 'search term');

      expect(mockService.getAllSessions).toHaveBeenCalledWith({
        limit: 50,
        offset: 10,
        eventId: TEST_EVENT_ID,
        search: 'search term',
      });
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockNonAdminAuth();

      await expect(controller.getAllSessions(USER_AUTH_HEADER)).rejects.toThrow(ForbiddenException);
      expect(mockService.getAllSessions).not.toHaveBeenCalled();
    });
  });

  describe('getAllActivity', () => {
    it('should return all activity with default parameters', async () => {
      mockAdminAuth();
      const mockResult = {
        activities: [],
        total: 0,
        stats: { newEntries: 0, modifications: 0, deletions: 0 },
      };
      mockService.getAllActivity.mockResolvedValue(mockResult);

      const result = await controller.getAllActivity(ADMIN_AUTH_HEADER);

      expect(result).toEqual(mockResult);
      expect(mockService.getAllActivity).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        seasonId: undefined,
        search: undefined,
        actionType: undefined,
      });
    });

    it('should pass through all query parameters', async () => {
      mockAdminAuth();
      mockService.getAllActivity.mockResolvedValue({ activities: [], total: 0, stats: { newEntries: 0, modifications: 0, deletions: 0 } });

      await controller.getAllActivity(ADMIN_AUTH_HEADER, '30', '5', 'season_1', 'test', 'modification');

      expect(mockService.getAllActivity).toHaveBeenCalledWith({
        limit: 30,
        offset: 5,
        seasonId: 'season_1',
        search: 'test',
        actionType: 'modification',
      });
    });

    it('should throw ForbiddenException for non-admin', async () => {
      mockNonAdminAuth();

      await expect(controller.getAllActivity(USER_AUTH_HEADER)).rejects.toThrow(ForbiddenException);
      expect(mockService.getAllActivity).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // Event-level Endpoints (no auth required)
  // ====================================================================

  describe('getEventSessions', () => {
    it('should return sessions for an event', async () => {
      const sessions = [mockSession];
      mockService.getEventSessions.mockResolvedValue(sessions);

      const result = await controller.getEventSessions(TEST_EVENT_ID);

      expect(result).toEqual(sessions);
      expect(mockService.getEventSessions).toHaveBeenCalledWith(TEST_EVENT_ID);
    });

    it('should return empty array when no sessions exist', async () => {
      mockService.getEventSessions.mockResolvedValue([]);

      const result = await controller.getEventSessions(TEST_EVENT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getEventModifications', () => {
    it('should return modifications for an event', async () => {
      const modifications = [mockAuditLog];
      mockService.getEventModifications.mockResolvedValue(modifications);

      const result = await controller.getEventModifications(TEST_EVENT_ID);

      expect(result).toEqual(modifications);
      expect(mockService.getEventModifications).toHaveBeenCalledWith(TEST_EVENT_ID);
    });

    it('should return empty array when no modifications exist', async () => {
      mockService.getEventModifications.mockResolvedValue([]);

      const result = await controller.getEventModifications(TEST_EVENT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getEventDeletions', () => {
    it('should return deletions for an event', async () => {
      const deletions = [{ ...mockAuditLog, action: 'delete' }];
      mockService.getEventDeletions.mockResolvedValue(deletions);

      const result = await controller.getEventDeletions(TEST_EVENT_ID);

      expect(result).toEqual(deletions);
      expect(mockService.getEventDeletions).toHaveBeenCalledWith(TEST_EVENT_ID);
    });

    it('should return empty array when no deletions exist', async () => {
      mockService.getEventDeletions.mockResolvedValue([]);

      const result = await controller.getEventDeletions(TEST_EVENT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getEventAllLogs', () => {
    it('should return all logs for an event (imports, modifications, deletions)', async () => {
      const allLogs = {
        imports: [mockSession],
        modifications: [mockAuditLog],
        deletions: [],
      };
      mockService.getEventAllLogs.mockResolvedValue(allLogs);

      const result = await controller.getEventAllLogs(TEST_EVENT_ID);

      expect(result).toEqual(allLogs);
      expect(mockService.getEventAllLogs).toHaveBeenCalledWith(TEST_EVENT_ID);
    });

    it('should return empty categories when no logs exist', async () => {
      mockService.getEventAllLogs.mockResolvedValue({ imports: [], modifications: [], deletions: [] });

      const result = await controller.getEventAllLogs(TEST_EVENT_ID);

      expect(result.imports).toEqual([]);
      expect(result.modifications).toEqual([]);
      expect(result.deletions).toEqual([]);
    });
  });

  // ====================================================================
  // Individual Log Endpoint
  // ====================================================================

  describe('getAuditLogById', () => {
    it('should return an audit log by ID', async () => {
      mockService.getAuditLogById.mockResolvedValue(mockAuditLog);

      const result = await controller.getAuditLogById(TEST_LOG_ID);

      expect(result).toEqual(mockAuditLog);
      expect(mockService.getAuditLogById).toHaveBeenCalledWith(TEST_LOG_ID);
    });

    it('should throw NotFoundException when audit log is not found', async () => {
      mockService.getAuditLogById.mockResolvedValue(null);

      await expect(controller.getAuditLogById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // Session Audit Logs Endpoint
  // ====================================================================

  describe('getSessionAuditLogs', () => {
    it('should return audit logs for a session', async () => {
      const logs = [mockAuditLog];
      mockService.getSessionAuditLogs.mockResolvedValue(logs);

      const result = await controller.getSessionAuditLogs(TEST_SESSION_ID);

      expect(result).toEqual(logs);
      expect(mockService.getSessionAuditLogs).toHaveBeenCalledWith(TEST_SESSION_ID);
    });

    it('should return empty array when no logs exist for session', async () => {
      mockService.getSessionAuditLogs.mockResolvedValue([]);

      const result = await controller.getSessionAuditLogs(TEST_SESSION_ID);

      expect(result).toEqual([]);
    });
  });

  // ====================================================================
  // Session File Download Endpoint
  // ====================================================================

  describe('downloadSessionFile', () => {
    it('should throw NotFoundException when no file path exists for session', async () => {
      mockService.getSessionFilePath.mockResolvedValue(null);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await expect(
        controller.downloadSessionFile(TEST_SESSION_ID, mockRes as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when file does not exist on disk', async () => {
      mockService.getSessionFilePath.mockResolvedValue('/nonexistent/path/file.xlsx');

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await expect(
        controller.downloadSessionFile(TEST_SESSION_ID, mockRes as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // Service Error Propagation
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from getEventSessions', async () => {
      mockService.getEventSessions.mockRejectedValue(new Error('DB error'));

      await expect(controller.getEventSessions(TEST_EVENT_ID)).rejects.toThrow('DB error');
    });

    it('should propagate errors from getEventModifications', async () => {
      mockService.getEventModifications.mockRejectedValue(new Error('DB error'));

      await expect(controller.getEventModifications(TEST_EVENT_ID)).rejects.toThrow('DB error');
    });

    it('should propagate errors from getEventDeletions', async () => {
      mockService.getEventDeletions.mockRejectedValue(new Error('DB error'));

      await expect(controller.getEventDeletions(TEST_EVENT_ID)).rejects.toThrow('DB error');
    });

    it('should propagate errors from getSessionAuditLogs', async () => {
      mockService.getSessionAuditLogs.mockRejectedValue(new Error('DB error'));

      await expect(controller.getSessionAuditLogs(TEST_SESSION_ID)).rejects.toThrow('DB error');
    });

    it('should propagate errors from getAllSessions', async () => {
      mockAdminAuth();
      mockService.getAllSessions.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllSessions(ADMIN_AUTH_HEADER)).rejects.toThrow('DB error');
    });

    it('should propagate errors from getAllActivity', async () => {
      mockAdminAuth();
      mockService.getAllActivity.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllActivity(ADMIN_AUTH_HEADER)).rejects.toThrow('DB error');
    });
  });
});
