import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CompetitionFormatsController } from '../competition-formats.controller';
import { CompetitionFormatsService } from '../competition-formats.service';

describe('CompetitionFormatsController', () => {
  let controller: CompetitionFormatsController;
  let mockService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn().mockResolvedValue([]),
      findActive: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitionFormatsController],
      providers: [
        { provide: CompetitionFormatsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<CompetitionFormatsController>(CompetitionFormatsController);
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

  describe('getAllFormats', () => {
    it('should return all competition formats', async () => {
      const mockFormats = [
        { id: '1', name: 'SPL', abbreviation: 'SPL', isActive: true },
        { id: '2', name: 'SQL', abbreviation: 'SQL', isActive: true },
        { id: '3', name: 'SSI', abbreviation: 'SSI', isActive: false },
      ];
      mockService.findAll.mockResolvedValue(mockFormats);

      const result = await controller.getAllFormats();

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockFormats);
    });

    it('should return empty array when no formats exist', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.getAllFormats();

      expect(result).toEqual([]);
    });
  });

  describe('getActiveFormats', () => {
    it('should return only active competition formats', async () => {
      const mockFormats = [
        { id: '1', name: 'SPL', isActive: true },
        { id: '2', name: 'SQL', isActive: true },
      ];
      mockService.findActive.mockResolvedValue(mockFormats);

      const result = await controller.getActiveFormats();

      expect(mockService.findActive).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockFormats);
    });

    it('should return empty array when no active formats exist', async () => {
      mockService.findActive.mockResolvedValue([]);

      const result = await controller.getActiveFormats();

      expect(result).toEqual([]);
    });
  });

  describe('getFormat', () => {
    it('should return a competition format by ID', async () => {
      const mockFormat = { id: 'format-1', name: 'SPL', abbreviation: 'SPL' };
      mockService.findById.mockResolvedValue(mockFormat);

      const result = await controller.getFormat('format-1');

      expect(mockService.findById).toHaveBeenCalledWith('format-1');
      expect(result).toEqual(mockFormat);
    });

    it('should propagate NotFoundException when format is not found', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException('Competition format with ID nonexistent not found'),
      );

      await expect(controller.getFormat('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // CREATE ENDPOINT
  // ====================================================================

  describe('createFormat', () => {
    it('should create a new competition format', async () => {
      const createData = { name: 'New Format', abbreviation: 'NF', description: 'A new format' };
      const mockCreated = { id: 'new-1', ...createData, isActive: true, displayOrder: 0 };
      mockService.create.mockResolvedValue(mockCreated);

      const result = await controller.createFormat(createData as any);

      expect(mockService.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockCreated);
    });

    it('should propagate ConflictException when format name already exists', async () => {
      const createData = { name: 'SPL' };
      mockService.create.mockRejectedValue(
        new ConflictException('Format with name "SPL" already exists'),
      );

      await expect(controller.createFormat(createData as any)).rejects.toThrow(ConflictException);
    });
  });

  // ====================================================================
  // UPDATE ENDPOINT
  // ====================================================================

  describe('updateFormat', () => {
    it('should update a competition format', async () => {
      const updateData = { name: 'Updated SPL', description: 'Updated description' };
      const mockUpdated = { id: 'format-1', name: 'Updated SPL', description: 'Updated description' };
      mockService.update.mockResolvedValue(mockUpdated);

      const result = await controller.updateFormat('format-1', updateData as any);

      expect(mockService.update).toHaveBeenCalledWith('format-1', updateData);
      expect(result).toEqual(mockUpdated);
    });

    it('should propagate NotFoundException when format to update is not found', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException('Competition format with ID nonexistent not found'),
      );

      await expect(
        controller.updateFormat('nonexistent', { name: 'test' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException when updated name conflicts', async () => {
      mockService.update.mockRejectedValue(
        new ConflictException('Format with name "SQL" already exists'),
      );

      await expect(
        controller.updateFormat('format-1', { name: 'SQL' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ====================================================================
  // DELETE ENDPOINT
  // ====================================================================

  describe('deleteFormat', () => {
    it('should delete a competition format', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.deleteFormat('format-1');

      expect(mockService.delete).toHaveBeenCalledWith('format-1');
    });

    it('should propagate NotFoundException when format to delete is not found', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException('Competition format with ID nonexistent not found'),
      );

      await expect(controller.deleteFormat('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate service errors from findAll', async () => {
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllFormats()).rejects.toThrow('DB error');
    });

    it('should propagate service errors from findActive', async () => {
      mockService.findActive.mockRejectedValue(new Error('DB error'));

      await expect(controller.getActiveFormats()).rejects.toThrow('DB error');
    });

    it('should propagate service errors from create', async () => {
      mockService.create.mockRejectedValue(new Error('Validation error'));

      await expect(controller.createFormat({ name: 'Test' } as any)).rejects.toThrow('Validation error');
    });

    it('should propagate service errors from update', async () => {
      mockService.update.mockRejectedValue(new Error('DB error'));

      await expect(controller.updateFormat('1', { name: 'Test' } as any)).rejects.toThrow('DB error');
    });

    it('should propagate service errors from delete', async () => {
      mockService.delete.mockRejectedValue(new Error('DB error'));

      await expect(controller.deleteFormat('1')).rejects.toThrow('DB error');
    });
  });
});
