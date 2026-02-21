import { Test, TestingModule } from '@nestjs/testing';
import { SiteSettingsController } from '../site-settings.controller';
import { SiteSettingsService } from '../site-settings.service';

describe('SiteSettingsController', () => {
  let controller: SiteSettingsController;
  let mockService: Record<string, jest.Mock>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockService = {
      findAll: jest.fn().mockResolvedValue([]),
      findByKey: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteSettingsController],
      providers: [
        { provide: SiteSettingsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SiteSettingsController>(SiteSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ====================================================================
  // listSettings
  // ====================================================================
  describe('listSettings', () => {
    it('should return all settings from the service', async () => {
      const mockSettings = [
        { id: '1', setting_key: 'maintenance_mode', setting_value: 'false', setting_type: 'boolean' },
        { id: '2', setting_key: 'site_title', setting_value: 'MECA', setting_type: 'string' },
      ];
      mockService.findAll.mockResolvedValue(mockSettings);

      const result = await controller.listSettings();

      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSettings);
    });

    it('should return an empty array when no settings exist', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await controller.listSettings();

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockService.findAll.mockRejectedValue(new Error('DB connection failed'));

      await expect(controller.listSettings()).rejects.toThrow('DB connection failed');
    });
  });

  // ====================================================================
  // getSetting
  // ====================================================================
  describe('getSetting', () => {
    it('should return a setting by key', async () => {
      const mockSetting = {
        id: '1',
        setting_key: 'maintenance_mode',
        setting_value: 'false',
        setting_type: 'boolean',
      };
      mockService.findByKey.mockResolvedValue(mockSetting);

      const result = await controller.getSetting('maintenance_mode');

      expect(mockService.findByKey).toHaveBeenCalledWith('maintenance_mode');
      expect(result).toEqual(mockSetting);
    });

    it('should return null when the key is not found', async () => {
      mockService.findByKey.mockResolvedValue(null);

      const result = await controller.getSetting('nonexistent_key');

      expect(mockService.findByKey).toHaveBeenCalledWith('nonexistent_key');
      expect(result).toBeNull();
    });

    it('should propagate service errors', async () => {
      mockService.findByKey.mockRejectedValue(new Error('Query failed'));

      await expect(controller.getSetting('bad_key')).rejects.toThrow('Query failed');
    });
  });

  // ====================================================================
  // upsertSetting
  // ====================================================================
  describe('upsertSetting', () => {
    it('should upsert a setting with all fields', async () => {
      const dto = {
        key: 'maintenance_mode',
        value: 'true',
        type: 'boolean',
        description: 'Controls maintenance mode',
        updatedBy: 'admin_123',
      };
      const mockResult = {
        id: '1',
        setting_key: 'maintenance_mode',
        setting_value: 'true',
        setting_type: 'boolean',
        description: 'Controls maintenance mode',
        updated_by: 'admin_123',
      };
      mockService.upsert.mockResolvedValue(mockResult);

      const result = await controller.upsertSetting(dto);

      expect(mockService.upsert).toHaveBeenCalledWith(
        'maintenance_mode',
        'true',
        'boolean',
        'Controls maintenance mode',
        'admin_123',
      );
      expect(result).toEqual(mockResult);
    });

    it('should upsert a setting without optional description', async () => {
      const dto = {
        key: 'site_title',
        value: 'MECA V2',
        type: 'string',
        updatedBy: 'admin_456',
      };
      mockService.upsert.mockResolvedValue({
        id: '2',
        setting_key: 'site_title',
        setting_value: 'MECA V2',
      });

      await controller.upsertSetting(dto);

      expect(mockService.upsert).toHaveBeenCalledWith(
        'site_title',
        'MECA V2',
        'string',
        undefined,
        'admin_456',
      );
    });

    it('should propagate service errors', async () => {
      const dto = {
        key: 'fail_key',
        value: 'fail',
        type: 'string',
        updatedBy: 'admin_123',
      };
      mockService.upsert.mockRejectedValue(new Error('Upsert failed'));

      await expect(controller.upsertSetting(dto)).rejects.toThrow('Upsert failed');
    });
  });

  // ====================================================================
  // deleteSetting
  // ====================================================================
  describe('deleteSetting', () => {
    it('should delete a setting by key', async () => {
      mockService.delete.mockResolvedValue(true);

      await controller.deleteSetting('maintenance_mode');

      expect(mockService.delete).toHaveBeenCalledWith('maintenance_mode');
    });

    it('should handle deleting a nonexistent key (returns false from service)', async () => {
      mockService.delete.mockResolvedValue(false);

      await controller.deleteSetting('nonexistent_key');

      expect(mockService.delete).toHaveBeenCalledWith('nonexistent_key');
    });

    it('should propagate service errors', async () => {
      mockService.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.deleteSetting('bad_key')).rejects.toThrow('Delete failed');
    });
  });
});
