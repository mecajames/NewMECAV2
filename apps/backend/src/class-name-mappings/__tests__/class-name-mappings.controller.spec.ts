import { Test, TestingModule } from '@nestjs/testing';
import { ClassNameMappingsController } from '../class-name-mappings.controller';
import { ClassNameMappingsService } from '../class-name-mappings.service';

describe('ClassNameMappingsController', () => {
  let controller: ClassNameMappingsController;
  let mockService: Record<string, jest.Mock>;

  const TEST_MAPPING_ID = 'mapping_123';

  const mockMapping = {
    id: TEST_MAPPING_ID,
    sourceName: 'SQ 1',
    targetClassId: 'class_abc',
    sourceSystem: 'termlab',
    isActive: true,
    notes: 'Test mapping',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn().mockResolvedValue([]),
      findActive: jest.fn().mockResolvedValue([]),
      getUnmappedClassNames: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(mockMapping),
      create: jest.fn().mockResolvedValue(mockMapping),
      bulkCreateMappings: jest.fn().mockResolvedValue({ created: 0, errors: [] }),
      update: jest.fn().mockResolvedValue(mockMapping),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassNameMappingsController],
      providers: [
        { provide: ClassNameMappingsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ClassNameMappingsController>(ClassNameMappingsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // GET Endpoints
  // ====================================================================

  describe('findAll', () => {
    it('should return all class name mappings', async () => {
      const mappings = [mockMapping, { ...mockMapping, id: 'mapping_2', sourceName: 'SQ 2' }];
      mockService.findAll.mockResolvedValue(mappings);

      const result = await controller.findAll();

      expect(result).toEqual(mappings);
      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no mappings exist', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should return only active mappings', async () => {
      const activeMappings = [mockMapping];
      mockService.findActive.mockResolvedValue(activeMappings);

      const result = await controller.findActive();

      expect(result).toEqual(activeMappings);
      expect(mockService.findActive).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no active mappings exist', async () => {
      mockService.findActive.mockResolvedValue([]);

      const result = await controller.findActive();

      expect(result).toEqual([]);
    });
  });

  describe('getUnmapped', () => {
    it('should return unmapped class names with counts', async () => {
      const unmapped = [
        { className: 'Unknown Class A', count: 15, format: 'SPL' },
        { className: 'Unknown Class B', count: 8, format: 'SQ' },
      ];
      mockService.getUnmappedClassNames.mockResolvedValue(unmapped);

      const result = await controller.getUnmapped();

      expect(result).toEqual(unmapped);
      expect(mockService.getUnmappedClassNames).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when all class names are mapped', async () => {
      mockService.getUnmappedClassNames.mockResolvedValue([]);

      const result = await controller.getUnmapped();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a mapping by ID', async () => {
      mockService.findById.mockResolvedValue(mockMapping);

      const result = await controller.findById(TEST_MAPPING_ID);

      expect(result).toEqual(mockMapping);
      expect(mockService.findById).toHaveBeenCalledWith(TEST_MAPPING_ID);
    });

    it('should propagate NotFoundException when mapping is not found', async () => {
      mockService.findById.mockRejectedValue(new Error('Class name mapping with ID nonexistent not found'));

      await expect(controller.findById('nonexistent')).rejects.toThrow(
        'Class name mapping with ID nonexistent not found',
      );
    });
  });

  // ====================================================================
  // CREATE Endpoints
  // ====================================================================

  describe('create', () => {
    it('should create a new mapping with all fields', async () => {
      const createData = {
        sourceName: 'New Class',
        targetClassId: 'class_xyz',
        sourceSystem: 'termlab',
        isActive: true,
        notes: 'A new mapping',
      };
      const createdMapping = { ...mockMapping, ...createData };
      mockService.create.mockResolvedValue(createdMapping);

      const result = await controller.create(createData);

      expect(result).toEqual(createdMapping);
      expect(mockService.create).toHaveBeenCalledWith(createData);
    });

    it('should create a mapping with minimal fields', async () => {
      const createData = { sourceName: 'Minimal Class' };
      mockService.create.mockResolvedValue({ ...mockMapping, sourceName: 'Minimal Class' });

      const result = await controller.create(createData);

      expect(mockService.create).toHaveBeenCalledWith(createData);
      expect(result.sourceName).toBe('Minimal Class');
    });

    it('should propagate NotFoundException when target class does not exist', async () => {
      mockService.create.mockRejectedValue(new Error('Target class with ID bad_id not found'));

      await expect(
        controller.create({ sourceName: 'Test', targetClassId: 'bad_id' }),
      ).rejects.toThrow('Target class with ID bad_id not found');
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create mappings and return result', async () => {
      const mappingsData = {
        mappings: [
          { sourceName: 'Class A', targetClassId: 'cls_1' },
          { sourceName: 'Class B', targetClassId: 'cls_2' },
        ],
      };
      mockService.bulkCreateMappings.mockResolvedValue({ created: 2, errors: [] });

      const result = await controller.bulkCreate(mappingsData);

      expect(result).toEqual({ created: 2, errors: [] });
      expect(mockService.bulkCreateMappings).toHaveBeenCalledWith(mappingsData.mappings);
    });

    it('should return partial success with errors', async () => {
      const mappingsData = {
        mappings: [
          { sourceName: 'Class A' },
          { sourceName: 'Duplicate Class' },
        ],
      };
      mockService.bulkCreateMappings.mockResolvedValue({
        created: 1,
        errors: ['Mapping for "Duplicate Class" already exists'],
      });

      const result = await controller.bulkCreate(mappingsData);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Duplicate Class');
    });

    it('should handle empty mappings array', async () => {
      mockService.bulkCreateMappings.mockResolvedValue({ created: 0, errors: [] });

      const result = await controller.bulkCreate({ mappings: [] });

      expect(result).toEqual({ created: 0, errors: [] });
      expect(mockService.bulkCreateMappings).toHaveBeenCalledWith([]);
    });
  });

  // ====================================================================
  // UPDATE Endpoint
  // ====================================================================

  describe('update', () => {
    it('should update a mapping with all fields', async () => {
      const updateData = {
        sourceName: 'Updated Class',
        targetClassId: 'class_new',
        sourceSystem: 'manual',
        isActive: false,
        notes: 'Updated notes',
      };
      const updatedMapping = { ...mockMapping, ...updateData };
      mockService.update.mockResolvedValue(updatedMapping);

      const result = await controller.update(TEST_MAPPING_ID, updateData);

      expect(result).toEqual(updatedMapping);
      expect(mockService.update).toHaveBeenCalledWith(TEST_MAPPING_ID, updateData);
    });

    it('should update a mapping with partial fields', async () => {
      const updateData = { isActive: false };
      const updatedMapping = { ...mockMapping, isActive: false };
      mockService.update.mockResolvedValue(updatedMapping);

      const result = await controller.update(TEST_MAPPING_ID, updateData);

      expect(result).toEqual(updatedMapping);
      expect(mockService.update).toHaveBeenCalledWith(TEST_MAPPING_ID, { isActive: false });
    });

    it('should allow setting targetClassId to null', async () => {
      const updateData = { targetClassId: null };
      mockService.update.mockResolvedValue({ ...mockMapping, targetClassId: undefined });

      const result = await controller.update(TEST_MAPPING_ID, updateData);

      expect(mockService.update).toHaveBeenCalledWith(TEST_MAPPING_ID, { targetClassId: null });
    });

    it('should propagate NotFoundException when mapping is not found', async () => {
      mockService.update.mockRejectedValue(new Error('Class name mapping with ID bad_id not found'));

      await expect(
        controller.update('bad_id', { sourceName: 'Test' }),
      ).rejects.toThrow('Class name mapping with ID bad_id not found');
    });
  });

  // ====================================================================
  // DELETE Endpoint
  // ====================================================================

  describe('delete', () => {
    it('should delete a mapping', async () => {
      mockService.delete.mockResolvedValue(undefined);

      await controller.delete(TEST_MAPPING_ID);

      expect(mockService.delete).toHaveBeenCalledWith(TEST_MAPPING_ID);
    });

    it('should propagate NotFoundException when mapping is not found', async () => {
      mockService.delete.mockRejectedValue(new Error('Class name mapping with ID bad_id not found'));

      await expect(controller.delete('bad_id')).rejects.toThrow(
        'Class name mapping with ID bad_id not found',
      );
    });
  });

  // ====================================================================
  // Service Error Propagation
  // ====================================================================

  describe('service error propagation', () => {
    it('should propagate errors from findAll', async () => {
      mockService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.findAll()).rejects.toThrow('DB error');
    });

    it('should propagate errors from findActive', async () => {
      mockService.findActive.mockRejectedValue(new Error('DB error'));

      await expect(controller.findActive()).rejects.toThrow('DB error');
    });

    it('should propagate errors from getUnmappedClassNames', async () => {
      mockService.getUnmappedClassNames.mockRejectedValue(new Error('Query error'));

      await expect(controller.getUnmapped()).rejects.toThrow('Query error');
    });

    it('should propagate errors from bulkCreateMappings', async () => {
      mockService.bulkCreateMappings.mockRejectedValue(new Error('Bulk create error'));

      await expect(
        controller.bulkCreate({ mappings: [{ sourceName: 'Test' }] }),
      ).rejects.toThrow('Bulk create error');
    });
  });
});
