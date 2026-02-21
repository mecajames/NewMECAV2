import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RulebooksController } from '../rulebooks.controller';
import { RulebooksService } from '../rulebooks.service';

describe('RulebooksController', () => {
  let controller: RulebooksController;
  let mockService: Record<string, jest.Mock>;

  const TEST_RULEBOOK_ID = 'rulebook_123';

  const mockRulebook = {
    id: TEST_RULEBOOK_ID,
    title: 'Sound Quality Rules',
    category: 'SQ',
    season: 2026,
    pdfUrl: 'https://example.com/rulebook.pdf',
    isActive: true,
    status: 'active',
    description: 'Rules for sound quality competition',
    displayOrder: 1,
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn().mockResolvedValue([]),
      findAllIncludingInactive: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(mockRulebook),
      create: jest.fn().mockResolvedValue(mockRulebook),
      update: jest.fn().mockResolvedValue(mockRulebook),
      reorder: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RulebooksController],
      providers: [
        { provide: RulebooksService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<RulebooksController>(RulebooksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // GET ENDPOINTS
  // ====================================================================

  describe('getAllRulebooks', () => {
    it('should return all active rulebooks', async () => {
      const rulebooks = [mockRulebook, { ...mockRulebook, id: 'rulebook_456', title: 'SPL Rules' }];
      mockService.findAll.mockResolvedValue(rulebooks);

      const result = await controller.getAllRulebooks();

      expect(result).toEqual(rulebooks);
      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no rulebooks exist', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.getAllRulebooks();

      expect(result).toEqual([]);
    });
  });

  describe('getAllRulebooksForAdmin', () => {
    it('should return all rulebooks including inactive ones', async () => {
      const rulebooks = [
        mockRulebook,
        { ...mockRulebook, id: 'rulebook_456', status: 'inactive', isActive: false },
      ];
      mockService.findAllIncludingInactive.mockResolvedValue(rulebooks);

      const result = await controller.getAllRulebooksForAdmin();

      expect(result).toEqual(rulebooks);
      expect(mockService.findAllIncludingInactive).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no rulebooks exist', async () => {
      mockService.findAllIncludingInactive.mockResolvedValue([]);

      const result = await controller.getAllRulebooksForAdmin();

      expect(result).toEqual([]);
    });
  });

  describe('getRulebook', () => {
    it('should return a rulebook by ID', async () => {
      mockService.findById.mockResolvedValue(mockRulebook);

      const result = await controller.getRulebook(TEST_RULEBOOK_ID);

      expect(result).toEqual(mockRulebook);
      expect(mockService.findById).toHaveBeenCalledWith(TEST_RULEBOOK_ID);
    });

    it('should propagate NotFoundException when rulebook is not found', async () => {
      mockService.findById.mockRejectedValue(
        new NotFoundException(`Rulebook with ID nonexistent not found`),
      );

      await expect(controller.getRulebook('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // CREATE ENDPOINT
  // ====================================================================

  describe('createRulebook', () => {
    it('should create a new rulebook', async () => {
      const createData = {
        title: 'New Rulebook',
        category: 'SQ',
        season: 2026,
        pdfUrl: 'https://example.com/new-rulebook.pdf',
        status: 'active',
      };
      const created = { id: 'new_id', ...createData };
      mockService.create.mockResolvedValue(created);

      const result = await controller.createRulebook(createData as any);

      expect(result).toEqual(created);
      expect(mockService.create).toHaveBeenCalledWith(createData);
    });

    it('should propagate errors from service create', async () => {
      mockService.create.mockRejectedValue(new Error('Validation error'));

      await expect(controller.createRulebook({} as any)).rejects.toThrow('Validation error');
    });
  });

  // ====================================================================
  // UPDATE ENDPOINTS
  // ====================================================================

  describe('reorderRulebooks', () => {
    it('should reorder rulebooks', async () => {
      const items = [
        { id: 'rb_1', displayOrder: 1 },
        { id: 'rb_2', displayOrder: 2 },
        { id: 'rb_3', displayOrder: 3 },
      ];

      await controller.reorderRulebooks(items);

      expect(mockService.reorder).toHaveBeenCalledWith(items);
    });

    it('should handle empty reorder list', async () => {
      await controller.reorderRulebooks([]);

      expect(mockService.reorder).toHaveBeenCalledWith([]);
    });
  });

  describe('updateRulebook', () => {
    it('should update a rulebook', async () => {
      const updateData = { title: 'Updated Title', status: 'inactive' };
      const updated = { ...mockRulebook, ...updateData };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.updateRulebook(TEST_RULEBOOK_ID, updateData as any);

      expect(result).toEqual(updated);
      expect(mockService.update).toHaveBeenCalledWith(TEST_RULEBOOK_ID, updateData);
    });

    it('should propagate NotFoundException when rulebook is not found', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException(`Rulebook with ID nonexistent not found`),
      );

      await expect(
        controller.updateRulebook('nonexistent', { title: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // DELETE ENDPOINT
  // ====================================================================

  describe('deleteRulebook', () => {
    it('should delete a rulebook', async () => {
      await controller.deleteRulebook(TEST_RULEBOOK_ID);

      expect(mockService.delete).toHaveBeenCalledWith(TEST_RULEBOOK_ID);
    });

    it('should propagate NotFoundException when rulebook is not found', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException(`Rulebook with ID nonexistent not found`),
      );

      await expect(controller.deleteRulebook('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================================
  // SERVICE ERROR PROPAGATION
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from findAll', async () => {
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.getAllRulebooks()).rejects.toThrow('DB error');
    });

    it('should propagate errors from findAllIncludingInactive', async () => {
      mockService.findAllIncludingInactive.mockRejectedValue(new Error('Connection error'));

      await expect(controller.getAllRulebooksForAdmin()).rejects.toThrow('Connection error');
    });

    it('should propagate errors from reorder', async () => {
      mockService.reorder.mockRejectedValue(new Error('Reorder failed'));

      await expect(
        controller.reorderRulebooks([{ id: '1', displayOrder: 1 }]),
      ).rejects.toThrow('Reorder failed');
    });
  });
});
