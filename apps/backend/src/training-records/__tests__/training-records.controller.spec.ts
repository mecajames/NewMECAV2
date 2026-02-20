import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { TrainingRecordsController } from '../training-records.controller';
import { TrainingRecordsService } from '../training-records.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { UserRole, TraineeType, TrainingType, TrainingResult } from '@newmeca/shared';

describe('TrainingRecordsController', () => {
  let controller: TrainingRecordsController;
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

  function mockProfileNotFound(userId: string = TEST_USER_ID) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    (mockEm.findOne as jest.Mock).mockResolvedValue(null);
  }

  // Shared mock training record with populated trainer
  const mockTrainer = {
    id: 'trainer_1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
  };

  const mockRecord = {
    id: 'rec_1',
    trainee_type: TraineeType.JUDGE,
    trainee_id: 'trainee_1',
    training_type: TrainingType.SPL,
    training_date: new Date('2026-01-15'),
    result: TrainingResult.PASS,
    trainer: mockTrainer,
    notes: 'Good performance',
    created_at: new Date('2026-01-15'),
    updated_at: new Date('2026-01-15'),
  };

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
      getByTrainee: jest.fn().mockResolvedValue([]),
      getById: jest.fn().mockResolvedValue(mockRecord),
      create: jest.fn().mockResolvedValue(mockRecord),
      update: jest.fn().mockResolvedValue(mockRecord),
      delete: jest.fn().mockResolvedValue(undefined),
      getPotentialTrainers: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingRecordsController],
      providers: [
        { provide: TrainingRecordsService, useValue: mockService },
        { provide: SupabaseAdminService, useValue: mockSupabaseAdmin },
        { provide: 'EntityManager', useValue: mockEm },
      ],
    }).compile();

    controller = module.get<TrainingRecordsController>(TrainingRecordsController);
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
        controller.getById(undefined as any, 'rec_1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when auth header does not start with Bearer', async () => {
      await expect(
        controller.getById('Basic some_token', 'rec_1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockAuthFailure();

      await expect(
        controller.getById('Bearer invalid_token', 'rec_1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user profile is not found', async () => {
      mockProfileNotFound();

      await expect(
        controller.getById(VALID_AUTH_HEADER, 'rec_1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is not an admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getById(VALID_AUTH_HEADER, 'rec_1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when supabase throws an unexpected error', async () => {
      mockGetUser.mockRejectedValue(new Error('Network error'));

      await expect(
        controller.getById(VALID_AUTH_HEADER, 'rec_1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ====================================================================
  // healthCheck
  // ====================================================================
  describe('healthCheck', () => {
    it('should return ok status without requiring auth', () => {
      const result = controller.healthCheck();

      expect(result).toEqual({ status: 'ok', module: 'training-records' });
    });
  });

  // ====================================================================
  // getPotentialTrainers
  // ====================================================================
  describe('getPotentialTrainers', () => {
    it('should return mapped trainers when admin is authenticated', async () => {
      mockAdminAuth();
      const mockTrainers = [
        { id: 't1', first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', role: UserRole.ADMIN },
        { id: 't2', first_name: 'Bob', last_name: 'Jones', email: 'bob@example.com', role: UserRole.ADMIN },
      ];
      mockService.getPotentialTrainers.mockResolvedValue(mockTrainers);

      const result = await controller.getPotentialTrainers(ADMIN_AUTH_HEADER);

      expect(mockService.getPotentialTrainers).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        { id: 't1', first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', role: UserRole.ADMIN },
        { id: 't2', first_name: 'Bob', last_name: 'Jones', email: 'bob@example.com', role: UserRole.ADMIN },
      ]);
    });

    it('should return empty array when no trainers exist', async () => {
      mockAdminAuth();
      mockService.getPotentialTrainers.mockResolvedValue([]);

      const result = await controller.getPotentialTrainers(ADMIN_AUTH_HEADER);

      expect(result).toEqual([]);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(
        controller.getPotentialTrainers(undefined as any),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockService.getPotentialTrainers).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getPotentialTrainers(VALID_AUTH_HEADER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.getPotentialTrainers).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // getByTrainee
  // ====================================================================
  describe('getByTrainee', () => {
    it('should return mapped training records for a trainee', async () => {
      mockAdminAuth();
      const records = [mockRecord];
      mockService.getByTrainee.mockResolvedValue(records);

      const result = await controller.getByTrainee(ADMIN_AUTH_HEADER, TraineeType.JUDGE, 'trainee_1');

      expect(mockService.getByTrainee).toHaveBeenCalledWith(TraineeType.JUDGE, 'trainee_1');
      expect(result).toEqual([
        {
          id: 'rec_1',
          trainee_type: TraineeType.JUDGE,
          trainee_id: 'trainee_1',
          training_type: TrainingType.SPL,
          training_date: mockRecord.training_date,
          result: TrainingResult.PASS,
          trainer_id: 'trainer_1',
          notes: 'Good performance',
          created_at: mockRecord.created_at,
          updated_at: mockRecord.updated_at,
          trainer: {
            id: 'trainer_1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
          },
        },
      ]);
    });

    it('should handle records without a trainer', async () => {
      mockAdminAuth();
      const recordWithoutTrainer = { ...mockRecord, trainer: undefined };
      mockService.getByTrainee.mockResolvedValue([recordWithoutTrainer]);

      const result = await controller.getByTrainee(ADMIN_AUTH_HEADER, TraineeType.JUDGE, 'trainee_1');

      expect(result[0].trainer_id).toBeUndefined();
      expect(result[0].trainer).toBeUndefined();
    });

    it('should return empty array when no records exist', async () => {
      mockAdminAuth();
      mockService.getByTrainee.mockResolvedValue([]);

      const result = await controller.getByTrainee(ADMIN_AUTH_HEADER, TraineeType.EVENT_DIRECTOR, 'trainee_2');

      expect(result).toEqual([]);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(
        controller.getByTrainee(VALID_AUTH_HEADER, TraineeType.JUDGE, 'trainee_1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.getByTrainee).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // getById
  // ====================================================================
  describe('getById', () => {
    it('should return a mapped training record by ID', async () => {
      mockAdminAuth();
      mockService.getById.mockResolvedValue(mockRecord);

      const result = await controller.getById(ADMIN_AUTH_HEADER, 'rec_1');

      expect(mockService.getById).toHaveBeenCalledWith('rec_1');
      expect(result).toEqual({
        id: 'rec_1',
        trainee_type: TraineeType.JUDGE,
        trainee_id: 'trainee_1',
        training_type: TrainingType.SPL,
        training_date: mockRecord.training_date,
        result: TrainingResult.PASS,
        trainer_id: 'trainer_1',
        notes: 'Good performance',
        created_at: mockRecord.created_at,
        updated_at: mockRecord.updated_at,
        trainer: {
          id: 'trainer_1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
      });
    });

    it('should propagate NotFoundException from service', async () => {
      mockAdminAuth();
      mockService.getById.mockRejectedValue(
        new NotFoundException('Training record with ID rec_99 not found'),
      );

      await expect(controller.getById(ADMIN_AUTH_HEADER, 'rec_99')).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.getById(undefined as any, 'rec_1')).rejects.toThrow(UnauthorizedException);
      expect(mockService.getById).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // create
  // ====================================================================
  describe('create', () => {
    const createDto = {
      trainee_type: TraineeType.JUDGE,
      trainee_id: 'trainee_1',
      training_type: TrainingType.SPL,
      training_date: '2026-01-15',
      result: TrainingResult.PASS,
      trainer_id: 'trainer_1',
      notes: 'Created record',
    };

    it('should create a training record and return the full record', async () => {
      mockAdminAuth();
      const createdRecord = { ...mockRecord, id: 'new_rec_1' };
      mockService.create.mockResolvedValue(createdRecord);
      // getById is called after create to re-fetch with trainer populated
      mockService.getById.mockResolvedValue(createdRecord);

      const result = await controller.create(ADMIN_AUTH_HEADER, createDto);

      expect(mockService.create).toHaveBeenCalledWith(createDto);
      expect(mockService.getById).toHaveBeenCalledWith('new_rec_1');
      expect(result.id).toBe('new_rec_1');
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.create(undefined as any, createDto)).rejects.toThrow(UnauthorizedException);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.create(VALID_AUTH_HEADER, createDto)).rejects.toThrow(ForbiddenException);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      mockAdminAuth();
      mockService.create.mockRejectedValue(new Error('Trainer not found'));

      await expect(controller.create(ADMIN_AUTH_HEADER, createDto)).rejects.toThrow('Trainer not found');
    });
  });

  // ====================================================================
  // update
  // ====================================================================
  describe('update', () => {
    const updateDto = {
      result: TrainingResult.FAIL,
      notes: 'Updated notes',
    };

    it('should update a training record and return the mapped result', async () => {
      mockAdminAuth();
      const updatedRecord = { ...mockRecord, result: TrainingResult.FAIL, notes: 'Updated notes' };
      mockService.update.mockResolvedValue(updatedRecord);

      const result = await controller.update(ADMIN_AUTH_HEADER, 'rec_1', updateDto);

      expect(mockService.update).toHaveBeenCalledWith('rec_1', updateDto);
      expect(result.result).toBe(TrainingResult.FAIL);
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.update(undefined as any, 'rec_1', updateDto)).rejects.toThrow(UnauthorizedException);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.update(VALID_AUTH_HEADER, 'rec_1', updateDto)).rejects.toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      mockAdminAuth();
      mockService.update.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.update(ADMIN_AUTH_HEADER, 'rec_99', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // delete
  // ====================================================================
  describe('delete', () => {
    it('should delete a training record and return success', async () => {
      mockAdminAuth();
      mockService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(ADMIN_AUTH_HEADER, 'rec_1');

      expect(mockService.delete).toHaveBeenCalledWith('rec_1');
      expect(result).toEqual({ success: true });
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      await expect(controller.delete(undefined as any, 'rec_1')).rejects.toThrow(UnauthorizedException);
      expect(mockService.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      mockNonAdminAuth();

      await expect(controller.delete(VALID_AUTH_HEADER, 'rec_1')).rejects.toThrow(ForbiddenException);
      expect(mockService.delete).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException from service', async () => {
      mockAdminAuth();
      mockService.delete.mockRejectedValue(new NotFoundException('Not found'));

      await expect(controller.delete(ADMIN_AUTH_HEADER, 'rec_99')).rejects.toThrow(NotFoundException);
    });
  });
});
