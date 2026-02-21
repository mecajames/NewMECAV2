import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompetitionClassesController } from '../competition-classes.controller';
import { CompetitionClassesService } from '../competition-classes.service';

describe('CompetitionClassesController', () => {
  let controller: CompetitionClassesController;
  let mockService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn().mockResolvedValue([]),
      findActiveClasses: jest.fn().mockResolvedValue([]),
      findBySeason: jest.fn().mockResolvedValue([]),
      findByFormat: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue(undefined),
      copyBetweenSeasons: jest.fn().mockResolvedValue({ copied: 0, classes: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionClassesController],
      providers: [
        { provide: CompetitionClassesService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<CompetitionClassesController>(CompetitionClassesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ====================================================================
  // GET ENDPOINTS
  // ====================================================================

  describe('getAllClasses', () => {
    it('should return all competition classes', async () => {
      const mockClasses = [
        { id: '1', name: 'Amateur', format: 'SPL' },
        { id: '2', name: 'Pro', format: 'SPL' },
      ];
      mockService.findAll.mockResolvedValue(mockClasses);

      const result = await controller.getAllClasses();

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockClasses);
    });

    it('should return empty array when no classes exist', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.getAllClasses();

      expect(result).toEqual([]);
    });
  });

  describe('getActiveClasses', () => {
    it('should return only active competition classes', async () => {
      const mockClasses = [{ id: '1', name: 'Amateur', isActive: true }];
      mockService.findActiveClasses.mockResolvedValue(mockClasses);

      const result = await controller.getActiveClasses();

      expect(mockService.findActiveClasses).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockClasses);
    });

    it('should return empty array when no active classes exist', async () => {
      mockService.findActiveClasses.mockResolvedValue([]);

      const result = await controller.getActiveClasses();

      expect(result).toEqual([]);
    });
  });

  describe('getClassesBySeason', () => {
    it('should return classes for a specific season', async () => {
      const mockClasses = [{ id: '1', name: 'Amateur', seasonId: 'season-1' }];
      mockService.findBySeason.mockResolvedValue(mockClasses);

      const result = await controller.getClassesBySeason('season-1');

      expect(mockService.findBySeason).toHaveBeenCalledWith('season-1');
      expect(result).toEqual(mockClasses);
    });

    it('should return empty array when no classes exist for the season', async () => {
      mockService.findBySeason.mockResolvedValue([]);

      const result = await controller.getClassesBySeason('nonexistent-season');

      expect(result).toEqual([]);
    });
  });

  describe('getClassesByFormat', () => {
    it('should return classes for a specific format', async () => {
      const mockClasses = [
        { id: '1', name: 'Amateur', format: 'SPL' },
        { id: '2', name: 'Pro', format: 'SPL' },
      ];
      mockService.findByFormat.mockResolvedValue(mockClasses);

      const result = await controller.getClassesByFormat('SPL');

      expect(mockService.findByFormat).toHaveBeenCalledWith('SPL');
      expect(result).toEqual(mockClasses);
    });

    it('should return empty array when no classes exist for the format', async () => {
      mockService.findByFormat.mockResolvedValue([]);

      const result = await controller.getClassesByFormat('UNKNOWN');

      expect(result).toEqual([]);
    });
  });

  describe('getClass', () => {
    it('should return a competition class by ID', async () => {
      const mockClass = { id: 'class-1', name: 'Amateur', format: 'SPL' };
      mockService.findById.mockResolvedValue(mockClass);

      const result = await controller.getClass('class-1');

      expect(mockService.findById).toHaveBeenCalledWith('class-1');
      expect(result).toEqual(mockClass);
    });

    it('should propagate NotFoundException when class is not found', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException('Competition class with ID nonexistent not found'),
      );

      await expect(controller.getClass('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // CREATE ENDPOINT
  // ====================================================================

  describe('createClass', () => {
    it('should create a new competition class', async () => {
      const createData = { name: 'New Class', abbreviation: 'NC', format: 'SPL', season_id: 'season-1' };
      const mockCreated = { id: 'new-1', name: 'New Class', abbreviation: 'NC', format: 'SPL' };
      mockService.create.mockResolvedValue(mockCreated);

      const result = await controller.createClass(createData as any);

      expect(mockService.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockCreated);
    });

    it('should propagate NotFoundException when season is not found', async () => {
      const createData = { name: 'New Class', format: 'SPL', season_id: 'bad-season' };
      mockService.create.mockRejectedValue(
        new NotFoundException('Season with ID bad-season not found'),
      );

      await expect(controller.createClass(createData as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // UPDATE ENDPOINT
  // ====================================================================

  describe('updateClass', () => {
    it('should update a competition class', async () => {
      const updateData = { name: 'Updated Class' };
      const mockUpdated = { id: 'class-1', name: 'Updated Class', format: 'SPL' };
      mockService.update.mockResolvedValue(mockUpdated);

      const result = await controller.updateClass('class-1', updateData as any);

      expect(mockService.update).toHaveBeenCalledWith('class-1', updateData);
      expect(result).toEqual(mockUpdated);
    });

    it('should propagate NotFoundException when class to update is not found', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException('Competition class with ID nonexistent not found'),
      );

      await expect(controller.updateClass('nonexistent', { name: 'test' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ====================================================================
  // DELETE ENDPOINT
  // ====================================================================

  describe('deleteClass', () => {
    it('should delete a competition class', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.deleteClass('class-1');

      expect(mockService.delete).toHaveBeenCalledWith('class-1');
    });

    it('should propagate NotFoundException when class to delete is not found', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException('Competition class with ID nonexistent not found'),
      );

      await expect(controller.deleteClass('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // COPY BETWEEN SEASONS ENDPOINT
  // ====================================================================

  describe('copyBetweenSeasons', () => {
    it('should copy classes between seasons', async () => {
      const mockResult = {
        copied: 3,
        classes: [
          { id: 'new-1', name: 'Amateur' },
          { id: 'new-2', name: 'Pro' },
          { id: 'new-3', name: 'Expert' },
        ],
      };
      mockService.copyBetweenSeasons.mockResolvedValue(mockResult);

      const result = await controller.copyBetweenSeasons({
        fromSeasonId: 'season-1',
        toSeasonId: 'season-2',
      });

      expect(mockService.copyBetweenSeasons).toHaveBeenCalledWith('season-1', 'season-2', undefined);
      expect(result).toEqual(mockResult);
    });

    it('should pass optional format filter', async () => {
      mockService.copyBetweenSeasons.mockResolvedValue({ copied: 1, classes: [] });

      await controller.copyBetweenSeasons({
        fromSeasonId: 'season-1',
        toSeasonId: 'season-2',
        format: 'SPL',
      });

      expect(mockService.copyBetweenSeasons).toHaveBeenCalledWith('season-1', 'season-2', 'SPL');
    });

    it('should return zero copied when no source classes exist', async () => {
      mockService.copyBetweenSeasons.mockResolvedValue({ copied: 0, classes: [] });

      const result = await controller.copyBetweenSeasons({
        fromSeasonId: 'empty-season',
        toSeasonId: 'season-2',
      });

      expect(result).toEqual({ copied: 0, classes: [] });
    });

    it('should propagate NotFoundException when source season is not found', async () => {
      mockService.copyBetweenSeasons.mockRejectedValue(
        new NotFoundException('Source season with ID bad-season not found'),
      );

      await expect(
        controller.copyBetweenSeasons({ fromSeasonId: 'bad-season', toSeasonId: 'season-2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate NotFoundException when destination season is not found', async () => {
      mockService.copyBetweenSeasons.mockRejectedValue(
        new NotFoundException('Destination season with ID bad-season not found'),
      );

      await expect(
        controller.copyBetweenSeasons({ fromSeasonId: 'season-1', toSeasonId: 'bad-season' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate service errors from findAll', async () => {
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllClasses()).rejects.toThrow('DB error');
    });

    it('should propagate service errors from findActiveClasses', async () => {
      mockService.findActiveClasses.mockRejectedValue(new Error('DB error'));

      await expect(controller.getActiveClasses()).rejects.toThrow('DB error');
    });

    it('should propagate service errors from create', async () => {
      mockService.create.mockRejectedValue(new Error('Validation error'));

      await expect(controller.createClass({ name: 'Test' } as any)).rejects.toThrow('Validation error');
    });
  });
});
