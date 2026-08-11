import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SiteSettingsController } from '../site-settings.controller';
import { SiteSettingsService } from '../site-settings.service';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';

describe('SiteSettingsController', () => {
  let controller: SiteSettingsController;
  let mockService: Record<string, jest.Mock>;
  let mockEm: { fork: jest.Mock; findOne: jest.Mock };
  let getUserMock: jest.Mock;

  const AUTH = 'Bearer valid-token';
  const ADMIN_PROFILE = { id: 'admin_123', role: 'admin', email: 'admin@test.com' };
  // Super-admin = protected MECA ID (James 202401 / Mick 700947).
  const SUPER_ADMIN_PROFILE = { id: 'james_1', role: 'admin', meca_id: '202401' };

  function setAuthProfile(profile: any) {
    getUserMock.mockResolvedValue({ data: { user: { id: profile.id } }, error: null });
    mockEm.findOne.mockResolvedValue(profile);
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    mockService = {
      findAll: jest.fn().mockResolvedValue([]),
      findByKey: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      bulkUpsert: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(true),
    };

    getUserMock = jest.fn();
    mockEm = {
      findOne: jest.fn(),
      fork: jest.fn(),
    } as any;
    mockEm.fork.mockReturnValue(mockEm);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteSettingsController],
      providers: [
        { provide: SiteSettingsService, useValue: mockService },
        {
          provide: SupabaseAdminService,
          useValue: { getClient: jest.fn().mockReturnValue({ auth: { getUser: getUserMock } }) },
        },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    controller = module.get<SiteSettingsController>(SiteSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ====================================================================
  // listSettings (public)
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

    it('should redact secret-typed settings in the public list', async () => {
      mockService.findAll.mockResolvedValue([
        { id: '1', setting_key: 'meca_grace_admin_days', setting_value: '45', setting_type: 'secret' },
        { id: '2', setting_key: 'site_title', setting_value: 'MECA', setting_type: 'string' },
      ]);

      const result = await controller.listSettings();

      expect(result[0].setting_value).toBe('');
      expect(result[1].setting_value).toBe('MECA');
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
  // getSetting (public)
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

    it('should redact a secret-typed setting', async () => {
      mockService.findByKey.mockResolvedValue({
        id: '1',
        setting_key: 'meca_grace_amnesty_end_date',
        setting_value: '2026-08-25',
        setting_type: 'secret',
      });

      const result = await controller.getSetting('meca_grace_amnesty_end_date');

      expect(result?.setting_value).toBe('');
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
  // upsertSetting (admin; some keys super-admin-only)
  // ====================================================================
  describe('upsertSetting', () => {
    it('should upsert a setting with all fields', async () => {
      setAuthProfile(ADMIN_PROFILE);
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

      const result = await controller.upsertSetting(AUTH, dto);

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
      setAuthProfile(ADMIN_PROFILE);
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

      await controller.upsertSetting(AUTH, dto);

      expect(mockService.upsert).toHaveBeenCalledWith(
        'site_title',
        'MECA V2',
        'string',
        undefined,
        'admin_456',
      );
    });

    it('should REJECT grace/amnesty keys for a regular admin (super-admin only)', async () => {
      setAuthProfile(ADMIN_PROFILE);

      await expect(
        controller.upsertSetting(AUTH, {
          key: 'meca_grace_amnesty_end_date',
          value: '2030-01-01',
          type: 'secret',
          updatedBy: 'admin_123',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.upsert).not.toHaveBeenCalled();
    });

    it('should REJECT super_admin_password for a regular admin', async () => {
      setAuthProfile(ADMIN_PROFILE);

      await expect(
        controller.upsertSetting(AUTH, {
          key: 'super_admin_password',
          value: 'hacked',
          type: 'secret',
          updatedBy: 'admin_123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW grace/amnesty keys for a super-admin (protected MECA ID)', async () => {
      setAuthProfile(SUPER_ADMIN_PROFILE);
      mockService.upsert.mockResolvedValue({ id: '9' });

      await controller.upsertSetting(AUTH, {
        key: 'meca_grace_amnesty_end_date',
        value: '2030-01-01',
        type: 'secret',
        updatedBy: 'james_1',
      });

      expect(mockService.upsert).toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      setAuthProfile(ADMIN_PROFILE);
      const dto = {
        key: 'fail_key',
        value: 'fail',
        type: 'string',
        updatedBy: 'admin_123',
      };
      mockService.upsert.mockRejectedValue(new Error('Upsert failed'));

      await expect(controller.upsertSetting(AUTH, dto)).rejects.toThrow('Upsert failed');
    });
  });

  // ====================================================================
  // bulkUpsertSettings (admin; guarded keys super-admin-only)
  // ====================================================================
  describe('bulkUpsertSettings', () => {
    it('should REJECT a bulk payload containing a guarded key for a regular admin', async () => {
      setAuthProfile(ADMIN_PROFILE);

      await expect(
        controller.bulkUpsertSettings(AUTH, {
          settings: [
            { key: 'site_title', value: 'MECA', type: 'string', updatedBy: 'admin_123' },
            { key: 'meca_grace_admin_days', value: '9999', type: 'secret', updatedBy: 'admin_123' },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockService.bulkUpsert).not.toHaveBeenCalled();
    });

    it('should pass through unguarded bulk payloads for a regular admin', async () => {
      setAuthProfile(ADMIN_PROFILE);
      const settings = [{ key: 'site_title', value: 'MECA', type: 'string', updatedBy: 'admin_123' }];

      await controller.bulkUpsertSettings(AUTH, { settings });

      expect(mockService.bulkUpsert).toHaveBeenCalledWith(settings);
    });
  });

  // ====================================================================
  // deleteSetting (admin; guarded keys super-admin-only)
  // ====================================================================
  describe('deleteSetting', () => {
    it('should delete a setting by key', async () => {
      setAuthProfile(ADMIN_PROFILE);
      mockService.delete.mockResolvedValue(true);

      await controller.deleteSetting(AUTH, 'maintenance_mode');

      expect(mockService.delete).toHaveBeenCalledWith('maintenance_mode');
    });

    it('should REJECT deleting a guarded key for a regular admin', async () => {
      setAuthProfile(ADMIN_PROFILE);

      await expect(controller.deleteSetting(AUTH, 'meca_grace_self_serve_days')).rejects.toThrow(ForbiddenException);
      expect(mockService.delete).not.toHaveBeenCalled();
    });

    it('should handle deleting a nonexistent key (returns false from service)', async () => {
      setAuthProfile(ADMIN_PROFILE);
      mockService.delete.mockResolvedValue(false);

      await controller.deleteSetting(AUTH, 'nonexistent_key');

      expect(mockService.delete).toHaveBeenCalledWith('nonexistent_key');
    });

    it('should propagate service errors', async () => {
      setAuthProfile(ADMIN_PROFILE);
      mockService.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.deleteSetting(AUTH, 'bad_key')).rejects.toThrow('Delete failed');
    });
  });
});
