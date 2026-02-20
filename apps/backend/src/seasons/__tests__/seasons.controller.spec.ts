import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SeasonsController } from '../seasons.controller';
import { SeasonsService } from '../seasons.service';

describe('SeasonsController', () => {
  let controller: SeasonsController;
  let mockService: Record<string, jest.Mock>;

  const TEST_SEASON_ID = 'season_123';

  const mockSeason = {
    id: TEST_SEASON_ID,
    year: 2026,
    name: '2026 Season',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    isCurrent: true,
    isNext: false,
    qualificationPointsThreshold: 100,
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(mockSeason),
      getCurrentSeason: jest.fn().mockResolvedValue(null),
      getNextSeason: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockSeason),
      update: jest.fn().mockResolvedValue(mockSeason),
      setAsCurrent: jest.fn().mockResolvedValue(mockSeason),
      setAsNext: jest.fn().mockResolvedValue(mockSeason),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeasonsController],
      providers: [
        { provide: SeasonsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SeasonsController>(SeasonsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // GET ENDPOINTS
  // ====================================================================

  describe('getAllSeasons', () => {
    it('should return all seasons', async () => {
      const seasons = [
        mockSeason,
        { ...mockSeason, id: 'season_456', year: 2025, name: '2025 Season', isCurrent: false },
      ];
      mockService.findAll.mockResolvedValue(seasons);

      const result = await controller.getAllSeasons();

      expect(result).toEqual(seasons);
      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no seasons exist', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.getAllSeasons();

      expect(result).toEqual([]);
    });
  });

  describe('getCurrentSeason', () => {
    it('should return the current season', async () => {
      mockService.getCurrentSeason.mockResolvedValue(mockSeason);

      const result = await controller.getCurrentSeason();

      expect(result).toEqual(mockSeason);
      expect(mockService.getCurrentSeason).toHaveBeenCalledTimes(1);
    });

    it('should return null when no current season is set', async () => {
      mockService.getCurrentSeason.mockResolvedValue(null);

      const result = await controller.getCurrentSeason();

      expect(result).toBeNull();
    });
  });

  describe('getNextSeason', () => {
    it('should return the next season', async () => {
      const nextSeason = { ...mockSeason, id: 'season_456', year: 2027, isCurrent: false, isNext: true };
      mockService.getNextSeason.mockResolvedValue(nextSeason);

      const result = await controller.getNextSeason();

      expect(result).toEqual(nextSeason);
      expect(mockService.getNextSeason).toHaveBeenCalledTimes(1);
    });

    it('should return null when no next season is set', async () => {
      mockService.getNextSeason.mockResolvedValue(null);

      const result = await controller.getNextSeason();

      expect(result).toBeNull();
    });
  });

  describe('getSeason', () => {
    it('should return a season by ID', async () => {
      mockService.findById.mockResolvedValue(mockSeason);

      const result = await controller.getSeason(TEST_SEASON_ID);

      expect(result).toEqual(mockSeason);
      expect(mockService.findById).toHaveBeenCalledWith(TEST_SEASON_ID);
    });

    it('should propagate NotFoundException when season is not found', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException(`Season with ID nonexistent not found`),
      );

      await expect(controller.getSeason('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // CREATE ENDPOINT
  // ====================================================================

  describe('createSeason', () => {
    it('should create a new season', async () => {
      const createData = {
        year: 2027,
        name: '2027 Season',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
      };
      const created = { id: 'new_id', year: 2027, name: '2027 Season' };
      mockService.create.mockResolvedValue(created);

      const result = await controller.createSeason(createData as any);

      expect(result).toEqual(created);
      expect(mockService.create).toHaveBeenCalledWith(createData);
    });

    it('should propagate errors from service create', async () => {
      mockService.create.mockRejectedValue(new Error('Validation error'));

      await expect(controller.createSeason({} as any)).rejects.toThrow('Validation error');
    });
  });

  // ====================================================================
  // UPDATE ENDPOINTS
  // ====================================================================

  describe('updateSeason', () => {
    it('should update a season', async () => {
      const updateData = { name: 'Updated 2026 Season', year: 2026 };
      const updated = { ...mockSeason, name: 'Updated 2026 Season' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.updateSeason(TEST_SEASON_ID, updateData as any);

      expect(result).toEqual(updated);
      expect(mockService.update).toHaveBeenCalledWith(TEST_SEASON_ID, updateData);
    });

    it('should propagate NotFoundException when season is not found', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(`Season with ID nonexistent not found`),
      );

      await expect(
        controller.updateSeason('nonexistent', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setAsCurrent', () => {
    it('should set a season as the current season', async () => {
      const updatedSeason = { ...mockSeason, isCurrent: true, isNext: false };
      mockService.setAsCurrent.mockResolvedValue(updatedSeason);

      const result = await controller.setAsCurrent(TEST_SEASON_ID);

      expect(result).toEqual(updatedSeason);
      expect(mockService.setAsCurrent).toHaveBeenCalledWith(TEST_SEASON_ID);
    });

    it('should propagate NotFoundException when season is not found', async () => {
      mockService.setAsCurrent.mockRejectedValue(
        new NotFoundException(`Season with ID nonexistent not found`),
      );

      await expect(controller.setAsCurrent('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setAsNext', () => {
    it('should set a season as the next season', async () => {
      const updatedSeason = { ...mockSeason, isCurrent: false, isNext: true };
      mockService.setAsNext.mockResolvedValue(updatedSeason);

      const result = await controller.setAsNext(TEST_SEASON_ID);

      expect(result).toEqual(updatedSeason);
      expect(mockService.setAsNext).toHaveBeenCalledWith(TEST_SEASON_ID);
    });

    it('should propagate NotFoundException when season is not found', async () => {
      mockService.setAsNext.mockRejectedValue(
        new NotFoundException(`Season with ID nonexistent not found`),
      );

      await expect(controller.setAsNext('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // DELETE ENDPOINT
  // ====================================================================

  describe('deleteSeason', () => {
    it('should delete a season', async () => {
      await controller.deleteSeason(TEST_SEASON_ID);

      expect(mockService.delete).toHaveBeenCalledWith(TEST_SEASON_ID);
    });

    it('should propagate NotFoundException when season is not found', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException(`Season with ID nonexistent not found`),
      );

      await expect(controller.deleteSeason('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from findAll', async () => {
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllSeasons()).rejects.toThrow('DB error');
    });

    it('should propagate errors from getCurrentSeason', async () => {
      mockService.getCurrentSeason.mockRejectedValue(new Error('Connection error'));

      await expect(controller.getCurrentSeason()).rejects.toThrow('Connection error');
    });

    it('should propagate errors from getNextSeason', async () => {
      mockService.getNextSeason.mockRejectedValue(new Error('Connection error'));

      await expect(controller.getNextSeason()).rejects.toThrow('Connection error');
    });

    it('should propagate errors from create', async () => {
      mockService.create.mockRejectedValue(new Error('Create failed'));

      await expect(controller.createSeason({} as any)).rejects.toThrow('Create failed');
    });

    it('should propagate errors from delete', async () => {
      mockService.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.deleteSeason(TEST_SEASON_ID)).rejects.toThrow('Delete failed');
    });
  });
});
