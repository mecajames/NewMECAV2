import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AchievementsService } from '../achievements.service';
import { AchievementImageService } from '../image-generator/achievement-image.service';
import { AchievementDefinition } from '../achievement-definition.entity';
import { AchievementRecipient } from '../achievement-recipient.entity';
import { AchievementTemplate } from '../achievement-template.entity';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import {
  AchievementMetricType,
  AchievementType,
  ThresholdOperator,
  AchievementFormat,
} from '@newmeca/shared';

describe('AchievementsService', () => {
  let service: AchievementsService;
  let mockEm: ReturnType<typeof createMockEntityManager>;
  let mockImageService: Record<string, jest.Mock>;

  // ----------------------------------------------------------------
  // Helpers to build mock entities
  // ----------------------------------------------------------------

  function createMockDefinition(overrides: Partial<AchievementDefinition> = {}): AchievementDefinition {
    return {
      id: 'def-1',
      name: 'dB Club 130',
      description: '130+ dB Club',
      groupName: 'dB Clubs',
      achievementType: AchievementType.DYNAMIC,
      templateKey: 'db-club',
      renderValue: 130,
      format: AchievementFormat.SPL,
      competitionType: 'Certified at the Headrest',
      metricType: AchievementMetricType.SCORE,
      thresholdValue: 130,
      thresholdOperator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
      classFilter: undefined,
      divisionFilter: undefined,
      pointsMultiplier: undefined,
      isActive: true,
      displayOrder: 0,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      recipients: [] as any,
      ...overrides,
    } as AchievementDefinition;
  }

  function createMockRecipient(overrides: Record<string, any> = {}): AchievementRecipient {
    return {
      id: 'rec-1',
      achievement: createMockDefinition(),
      profile: { id: 'profile-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', full_name: 'John Doe', meca_id: '12345' },
      mecaId: '12345',
      achievedValue: 135.5,
      achievedAt: new Date('2026-01-15'),
      competitionResult: { id: 'result-1' },
      event: { id: 'event-1', title: 'MECA Championship' },
      season: { id: 'season-1', name: '2026 Season' },
      imageUrl: 'https://example.com/image.png',
      imageGeneratedAt: new Date('2026-01-15'),
      createdAt: new Date('2026-01-15'),
      ...overrides,
    } as unknown as AchievementRecipient;
  }

  function createMockTemplate(overrides: Record<string, any> = {}): AchievementTemplate {
    return {
      id: 'tpl-1',
      key: 'db-club',
      name: 'dB Club Template',
      baseImagePath: 'db-club-base.png',
      fontSize: 500,
      textX: 100,
      textY: 200,
      textColor: '#CC0F00',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      ...overrides,
    } as AchievementTemplate;
  }

  // ----------------------------------------------------------------
  // Test setup
  // ----------------------------------------------------------------

  beforeEach(async () => {
    mockEm = createMockEntityManager();
    // Add findAndCount mock (not in default mock)
    (mockEm as any).findAndCount = jest.fn().mockResolvedValue([[], 0]);

    mockImageService = {
      generateMissingImages: jest.fn().mockResolvedValue({ generated: 0, failed: 0 }),
      generateImageForRecipient: jest.fn().mockResolvedValue(true),
      deleteImage: jest.fn().mockResolvedValue(true),
      checkAssets: jest.fn().mockResolvedValue({ configured: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        { provide: EntityManager, useValue: mockEm },
        { provide: AchievementImageService, useValue: mockImageService },
      ],
    }).compile();

    service = module.get<AchievementsService>(AchievementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ================================================================
  // getAllDefinitions
  // ================================================================

  describe('getAllDefinitions', () => {
    it('should return paginated definitions with defaults', async () => {
      const definitions = [createMockDefinition()];
      (mockEm as any).findAndCount.mockResolvedValue([definitions, 1]);

      const result = await service.getAllDefinitions({} as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementDefinition,
        {},
        expect.objectContaining({
          orderBy: { groupName: 'ASC', competitionType: 'ASC', thresholdValue: 'ASC' },
          limit: 20,
          offset: 0,
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should apply format filter', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);

      await service.getAllDefinitions({ format: AchievementFormat.SPL } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementDefinition,
        expect.objectContaining({ format: AchievementFormat.SPL }),
        expect.anything(),
      );
    });

    it('should apply competition_type filter', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);

      await service.getAllDefinitions({ competition_type: 'Radical X' } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementDefinition,
        expect.objectContaining({ competitionType: 'Radical X' }),
        expect.anything(),
      );
    });

    it('should apply is_active filter', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);

      await service.getAllDefinitions({ is_active: true } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementDefinition,
        expect.objectContaining({ isActive: true }),
        expect.anything(),
      );
    });

    it('should handle custom page and limit', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);

      await service.getAllDefinitions({ page: 3, limit: 10 } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementDefinition,
        {},
        expect.objectContaining({
          limit: 10,
          offset: 20, // (3-1) * 10
        }),
      );
    });

    it('should serialize definitions to snake_case', async () => {
      const def = createMockDefinition();
      (mockEm as any).findAndCount.mockResolvedValue([[def], 1]);

      const result = await service.getAllDefinitions({} as any);

      const item = result.items[0];
      expect(item.group_name).toBe('dB Clubs');
      expect(item.achievement_type).toBe(AchievementType.DYNAMIC);
      expect(item.template_key).toBe('db-club');
      expect(item.render_value).toBe(130);
      expect(item.competition_type).toBe('Certified at the Headrest');
      expect(item.metric_type).toBe(AchievementMetricType.SCORE);
      expect(item.threshold_value).toBe(130);
      expect(item.threshold_operator).toBe(ThresholdOperator.GREATER_THAN_OR_EQUAL);
      expect(item.is_active).toBe(true);
      expect(item.display_order).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 55]);

      const result = await service.getAllDefinitions({ page: 1, limit: 20 } as any);

      expect(result.totalPages).toBe(3); // Math.ceil(55 / 20) = 3
    });
  });

  // ================================================================
  // getDefinitionById
  // ================================================================

  describe('getDefinitionById', () => {
    it('should return a serialized definition when found', async () => {
      const def = createMockDefinition();
      mockEm.findOne.mockResolvedValue(def as any);

      const result = await service.getDefinitionById('def-1');

      expect(mockEm.findOne).toHaveBeenCalledWith(AchievementDefinition, { id: 'def-1' });
      expect(result.id).toBe('def-1');
      expect(result.name).toBe('dB Club 130');
      expect(result.group_name).toBe('dB Clubs');
    });

    it('should throw NotFoundException when not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.getDefinitionById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getDefinitionById('nonexistent')).rejects.toThrow(
        'Achievement definition with ID nonexistent not found',
      );
    });
  });

  // ================================================================
  // createDefinition
  // ================================================================

  describe('createDefinition', () => {
    it('should create a definition and return serialized result', async () => {
      const dto = {
        name: 'dB Club 140',
        description: '140+ dB Club',
        group_name: 'dB Clubs',
        template_key: 'db-club',
        competition_type: 'Certified at the Headrest' as any,
        metric_type: AchievementMetricType.SCORE,
        threshold_value: 140,
      };

      // em.create returns the created object
      const createdDef = createMockDefinition({
        name: 'dB Club 140',
        thresholdValue: 140,
        renderValue: 140,
      });
      mockEm.create.mockReturnValue(createdDef as any);

      const result = await service.createDefinition(dto as any);

      expect(mockEm.create).toHaveBeenCalledWith(AchievementDefinition, expect.objectContaining({
        name: 'dB Club 140',
        thresholdValue: 140,
      }));
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(createdDef);
      expect(result.name).toBe('dB Club 140');
    });

    it('should default render_value to threshold_value for score metrics', async () => {
      const dto = {
        name: 'dB Club 150',
        template_key: 'db-club',
        competition_type: 'Certified at the Headrest' as any,
        metric_type: AchievementMetricType.SCORE,
        threshold_value: 150.7,
      };

      mockEm.create.mockReturnValue(createMockDefinition() as any);

      await service.createDefinition(dto as any);

      // For score metric, render_value defaults to Math.floor(threshold_value)
      expect(mockEm.create).toHaveBeenCalledWith(AchievementDefinition, expect.objectContaining({
        renderValue: 150, // Math.floor(150.7)
      }));
    });

    it('should use provided render_value when specified', async () => {
      const dto = {
        name: 'dB Club 150',
        template_key: 'db-club',
        competition_type: 'Certified at the Headrest' as any,
        metric_type: AchievementMetricType.SCORE,
        threshold_value: 150,
        render_value: 155,
      };

      mockEm.create.mockReturnValue(createMockDefinition() as any);

      await service.createDefinition(dto as any);

      expect(mockEm.create).toHaveBeenCalledWith(AchievementDefinition, expect.objectContaining({
        renderValue: 155,
      }));
    });

    it('should default achievement_type to DYNAMIC', async () => {
      const dto = {
        name: 'Test',
        template_key: 'test',
        competition_type: 'Certified at the Headrest' as any,
        metric_type: AchievementMetricType.SCORE,
        threshold_value: 100,
      };

      mockEm.create.mockReturnValue(createMockDefinition() as any);

      await service.createDefinition(dto as any);

      expect(mockEm.create).toHaveBeenCalledWith(AchievementDefinition, expect.objectContaining({
        achievementType: AchievementType.DYNAMIC,
      }));
    });

    it('should default threshold_operator to GREATER_THAN_OR_EQUAL', async () => {
      const dto = {
        name: 'Test',
        template_key: 'test',
        competition_type: 'Certified at the Headrest' as any,
        metric_type: AchievementMetricType.SCORE,
        threshold_value: 100,
      };

      mockEm.create.mockReturnValue(createMockDefinition() as any);

      await service.createDefinition(dto as any);

      expect(mockEm.create).toHaveBeenCalledWith(AchievementDefinition, expect.objectContaining({
        thresholdOperator: ThresholdOperator.GREATER_THAN_OR_EQUAL,
      }));
    });
  });

  // ================================================================
  // updateDefinition
  // ================================================================

  describe('updateDefinition', () => {
    it('should update a definition and return serialized result', async () => {
      const def = createMockDefinition();
      mockEm.findOne.mockResolvedValue(def as any);

      const result = await service.updateDefinition('def-1', { name: 'Updated Name' } as any);

      expect(def.name).toBe('Updated Name');
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when definition not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.updateDefinition('nonexistent', { name: 'Test' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only update provided fields', async () => {
      const def = createMockDefinition({ name: 'Original', description: 'Original desc' });
      mockEm.findOne.mockResolvedValue(def as any);

      await service.updateDefinition('def-1', { name: 'Updated' } as any);

      expect(def.name).toBe('Updated');
      expect(def.description).toBe('Original desc'); // unchanged
    });

    it('should update all supported fields', async () => {
      const def = createMockDefinition();
      mockEm.findOne.mockResolvedValue(def as any);

      await service.updateDefinition('def-1', {
        name: 'New Name',
        description: 'New Desc',
        group_name: 'New Group',
        achievement_type: AchievementType.STATIC,
        template_key: 'new-template',
        render_value: 999,
        format: AchievementFormat.SQL,
        competition_type: 'Radical X',
        metric_type: AchievementMetricType.POINTS,
        threshold_value: 200,
        threshold_operator: ThresholdOperator.GREATER_THAN,
        class_filter: ['ClassA'],
        division_filter: ['Div1'],
        points_multiplier: 2,
        is_active: false,
        display_order: 5,
      } as any);

      expect(def.name).toBe('New Name');
      expect(def.description).toBe('New Desc');
      expect(def.groupName).toBe('New Group');
      expect(def.achievementType).toBe(AchievementType.STATIC);
      expect(def.templateKey).toBe('new-template');
      expect(def.renderValue).toBe(999);
      expect(def.format).toBe(AchievementFormat.SQL);
      expect(def.competitionType).toBe('Radical X');
      expect(def.metricType).toBe(AchievementMetricType.POINTS);
      expect(def.thresholdValue).toBe(200);
      expect(def.thresholdOperator).toBe(ThresholdOperator.GREATER_THAN);
      expect(def.classFilter).toEqual(['ClassA']);
      expect(def.divisionFilter).toEqual(['Div1']);
      expect(def.pointsMultiplier).toBe(2);
      expect(def.isActive).toBe(false);
      expect(def.displayOrder).toBe(5);
    });
  });

  // ================================================================
  // deleteDefinition
  // ================================================================

  describe('deleteDefinition', () => {
    it('should delete a definition and return success', async () => {
      const def = createMockDefinition();
      mockEm.findOne.mockResolvedValue(def as any);

      const result = await service.deleteDefinition('def-1');

      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(def);
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when definition not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.deleteDefinition('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // getRecipients
  // ================================================================

  describe('getRecipients', () => {
    it('should return paginated recipients with defaults', async () => {
      const recipient = createMockRecipient();
      (mockEm as any).findAndCount.mockResolvedValue([[recipient], 1]);
      // Mock loadProfiles (em.find for profiles)
      mockEm.find.mockResolvedValue([
        { id: 'profile-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', full_name: 'John Doe', meca_id: '12345' },
      ] as any);

      const result = await service.getRecipients({} as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should apply achievement_id filter', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);
      mockEm.find.mockResolvedValue([]);

      await service.getRecipients({ achievement_id: 'def-1' } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementRecipient,
        expect.objectContaining({ achievement: expect.objectContaining({ id: 'def-1' }) }),
        expect.anything(),
      );
    });

    it('should apply profile_id filter', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);
      mockEm.find.mockResolvedValue([]);

      await service.getRecipients({ profile_id: 'profile-1' } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementRecipient,
        expect.objectContaining({ profile: { id: 'profile-1' } }),
        expect.anything(),
      );
    });

    it('should apply meca_id filter', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);
      mockEm.find.mockResolvedValue([]);

      await service.getRecipients({ meca_id: '12345' } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementRecipient,
        expect.objectContaining({ mecaId: '12345' }),
        expect.anything(),
      );
    });

    it('should apply group_name filter', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);
      mockEm.find.mockResolvedValue([]);

      await service.getRecipients({ group_name: 'dB Clubs' } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementRecipient,
        expect.objectContaining({ achievement: expect.objectContaining({ groupName: 'dB Clubs' }) }),
        expect.anything(),
      );
    });

    it('should apply search filter with $or conditions', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);
      mockEm.find.mockResolvedValue([]);

      await service.getRecipients({ search: 'john' } as any);

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        AchievementRecipient,
        expect.objectContaining({ $or: expect.any(Array) }),
        expect.anything(),
      );
    });
  });

  // ================================================================
  // getAchievementsForProfile
  // ================================================================

  describe('getAchievementsForProfile', () => {
    it('should return achievements for a given profile', async () => {
      const recipient = createMockRecipient();
      const template = createMockTemplate();
      // First em.find returns recipients, second returns templates
      mockEm.find
        .mockResolvedValueOnce([recipient] as any)
        .mockResolvedValueOnce([template] as any);

      const result = await service.getAchievementsForProfile('profile-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rec-1');
      expect(result[0].achievement_name).toBe('dB Club 130');
      expect(result[0].achieved_value).toBe(135.5);
      expect(result[0].template_key).toBe('db-club');
      expect(result[0].event_name).toBe('MECA Championship');
      expect(result[0].image_url).toBe('https://example.com/image.png');
    });

    it('should return empty array when no achievements found', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.getAchievementsForProfile('profile-1');

      expect(result).toEqual([]);
    });

    it('should use render_value from definition when available', async () => {
      const recipient = createMockRecipient();
      recipient.achievement.renderValue = 130;
      const template = createMockTemplate();
      mockEm.find
        .mockResolvedValueOnce([recipient] as any)
        .mockResolvedValueOnce([template] as any);

      const result = await service.getAchievementsForProfile('profile-1');

      expect(result[0].render_value).toBe(130);
    });

    it('should fall back to achieved_value when render_value is not set', async () => {
      const recipient = createMockRecipient();
      recipient.achievement.renderValue = undefined;
      const template = createMockTemplate();
      mockEm.find
        .mockResolvedValueOnce([recipient] as any)
        .mockResolvedValueOnce([template] as any);

      const result = await service.getAchievementsForProfile('profile-1');

      expect(result[0].render_value).toBe(135.5);
    });

    it('should include template info in response', async () => {
      const recipient = createMockRecipient();
      const template = createMockTemplate();
      mockEm.find
        .mockResolvedValueOnce([recipient] as any)
        .mockResolvedValueOnce([template] as any);

      process.env.SUPABASE_URL = 'https://test.supabase.co';
      const result = await service.getAchievementsForProfile('profile-1');

      expect(result[0].template_base_image_url).toContain('db-club-base.png');
      expect(result[0].template_font_size).toBe(500);
      expect(result[0].template_text_x).toBe(100);
      expect(result[0].template_text_y).toBe(200);
      expect(result[0].template_text_color).toBe('#CC0F00');

      delete process.env.SUPABASE_URL;
    });
  });

  // ================================================================
  // getAchievementsForMecaId
  // ================================================================

  describe('getAchievementsForMecaId', () => {
    it('should return achievements for a given MECA ID', async () => {
      const recipient = createMockRecipient();
      const template = createMockTemplate();
      mockEm.find
        .mockResolvedValueOnce([recipient] as any)
        .mockResolvedValueOnce([template] as any);

      const result = await service.getAchievementsForMecaId('12345');

      expect(mockEm.find).toHaveBeenCalledWith(
        AchievementRecipient,
        { mecaId: '12345' },
        expect.objectContaining({
          populate: ['achievement', 'event'],
          orderBy: { achievedAt: 'DESC' },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].achievement_name).toBe('dB Club 130');
    });

    it('should return empty array when no achievements found', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.getAchievementsForMecaId('99999');

      expect(result).toEqual([]);
    });
  });

  // ================================================================
  // getAllTemplates
  // ================================================================

  describe('getAllTemplates', () => {
    it('should return all active templates', async () => {
      const template = createMockTemplate();
      mockEm.find.mockResolvedValue([template] as any);

      const result = await service.getAllTemplates();

      expect(mockEm.find).toHaveBeenCalledWith(
        AchievementTemplate,
        { isActive: true },
        { orderBy: { name: 'ASC' } },
      );
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('db-club');
    });

    it('should serialize templates to snake_case', async () => {
      const template = createMockTemplate();
      mockEm.find.mockResolvedValue([template] as any);

      const result = await service.getAllTemplates();

      const item = result[0];
      expect(item.base_image_path).toBe('db-club-base.png');
      expect(item.font_size).toBe(500);
      expect(item.text_x).toBe(100);
      expect(item.text_y).toBe(200);
      expect(item.text_color).toBe('#CC0F00');
      expect(item.is_active).toBe(true);
    });

    it('should return empty array when no templates exist', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.getAllTemplates();

      expect(result).toEqual([]);
    });
  });

  // ================================================================
  // getTemplateByKey
  // ================================================================

  describe('getTemplateByKey', () => {
    it('should return a template when found', async () => {
      const template = createMockTemplate();
      mockEm.findOne.mockResolvedValue(template as any);

      const result = await service.getTemplateByKey('db-club');

      expect(mockEm.findOne).toHaveBeenCalledWith(AchievementTemplate, { key: 'db-club' });
      expect(result.key).toBe('db-club');
    });

    it('should throw NotFoundException when template not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.getTemplateByKey('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getTemplateByKey('nonexistent')).rejects.toThrow(
        'Achievement template with key nonexistent not found',
      );
    });
  });

  // ================================================================
  // deleteRecipient
  // ================================================================

  describe('deleteRecipient', () => {
    it('should delete a recipient and return success with details', async () => {
      const recipient = createMockRecipient();
      // findOne for recipient
      mockEm.findOne.mockResolvedValueOnce(recipient as any);
      // findOne for loadProfile
      mockEm.findOne.mockResolvedValueOnce({
        id: 'profile-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        meca_id: '12345',
      } as any);

      const result = await service.deleteRecipient('rec-1');

      expect(result.success).toBe(true);
      expect(result.deleted.id).toBe('rec-1');
      expect(result.deleted.achievement_name).toBe('dB Club 130');
      expect(result.deleted.profile_name).toBe('John Doe');
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(recipient);
    });

    it('should throw NotFoundException when recipient not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.deleteRecipient('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should delete associated image if present', async () => {
      const recipient = createMockRecipient({ imageUrl: 'https://example.com/image.png' });
      mockEm.findOne.mockResolvedValueOnce(recipient as any);
      mockEm.findOne.mockResolvedValueOnce({ id: 'profile-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' } as any);

      await service.deleteRecipient('rec-1');

      expect(mockImageService.deleteImage).toHaveBeenCalledWith('https://example.com/image.png');
    });

    it('should still delete recipient even if image deletion fails', async () => {
      const recipient = createMockRecipient({ imageUrl: 'https://example.com/image.png' });
      mockEm.findOne.mockResolvedValueOnce(recipient as any);
      mockEm.findOne.mockResolvedValueOnce({ id: 'profile-1', first_name: 'Test', last_name: 'User', email: 'test@example.com' } as any);
      mockImageService.deleteImage.mockRejectedValue(new Error('Storage error'));

      const result = await service.deleteRecipient('rec-1');

      expect(result.success).toBe(true);
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(recipient);
    });

    it('should not attempt image deletion when no imageUrl exists', async () => {
      const recipient = createMockRecipient({ imageUrl: undefined });
      mockEm.findOne.mockResolvedValueOnce(recipient as any);
      mockEm.findOne.mockResolvedValueOnce({ id: 'profile-1', first_name: 'Test', last_name: 'User', email: 'test@example.com' } as any);

      await service.deleteRecipient('rec-1');

      expect(mockImageService.deleteImage).not.toHaveBeenCalled();
    });
  });

  // ================================================================
  // manualAwardAchievement
  // ================================================================

  describe('manualAwardAchievement', () => {
    it('should throw NotFoundException when profile not found', async () => {
      // loadProfile returns null (via findOne)
      mockEm.findOne.mockResolvedValue(null);

      await expect(
        service.manualAwardAchievement({
          profile_id: 'nonexistent',
          achievement_id: 'def-1',
          achieved_value: 135,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when member has no active membership', async () => {
      // loadProfile returns a profile
      mockEm.findOne
        .mockResolvedValueOnce({ id: 'profile-1', email: 'test@example.com', meca_id: '12345' } as any)
        // isActiveMember -> em.fork().findOne(Membership, ...) returns null (no membership)
        .mockResolvedValueOnce(null);

      await expect(
        service.manualAwardAchievement({
          profile_id: 'profile-1',
          achievement_id: 'def-1',
          achieved_value: 135,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when achievement definition not found', async () => {
      // loadProfile returns a profile
      mockEm.findOne
        .mockResolvedValueOnce({ id: 'profile-1', email: 'test@example.com', meca_id: '12345' } as any)
        // isActiveMember -> returns a membership (truthy)
        .mockResolvedValueOnce({ id: 'mem-1' } as any)
        // findOne(AchievementDefinition, ...) -> null
        .mockResolvedValueOnce(null);

      await expect(
        service.manualAwardAchievement({
          profile_id: 'profile-1',
          achievement_id: 'nonexistent',
          achieved_value: 135,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when member already has the achievement', async () => {
      const def = createMockDefinition();
      // loadProfile
      mockEm.findOne
        .mockResolvedValueOnce({ id: 'profile-1', email: 'test@example.com', meca_id: '12345' } as any)
        // isActiveMember
        .mockResolvedValueOnce({ id: 'mem-1' } as any)
        // findOne(AchievementDefinition)
        .mockResolvedValueOnce(def as any)
        // findOne(AchievementRecipient) - existing
        .mockResolvedValueOnce({ id: 'existing-rec' } as any);

      await expect(
        service.manualAwardAchievement({
          profile_id: 'profile-1',
          achievement_id: 'def-1',
          achieved_value: 135,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully award achievement when all checks pass', async () => {
      const def = createMockDefinition({ groupName: undefined });
      const createdRecipient = createMockRecipient();
      // loadProfile
      mockEm.findOne
        .mockResolvedValueOnce({ id: 'profile-1', email: 'test@example.com', meca_id: '12345' } as any)
        // isActiveMember
        .mockResolvedValueOnce({ id: 'mem-1' } as any)
        // findOne(AchievementDefinition)
        .mockResolvedValueOnce(def as any)
        // findOne(AchievementRecipient) - no existing
        .mockResolvedValueOnce(null);
      mockEm.create.mockReturnValue(createdRecipient as any);

      const result = await service.manualAwardAchievement({
        profile_id: 'profile-1',
        achievement_id: 'def-1',
        achieved_value: 135,
      });

      expect(mockEm.create).toHaveBeenCalledWith(
        AchievementRecipient,
        expect.objectContaining({
          achievement: def,
          achievedValue: 135,
        }),
      );
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(createdRecipient);
      expect(result).toBe(createdRecipient);
    });

    it('should remove lower group achievement and award higher one', async () => {
      const def = createMockDefinition({ thresholdValue: 140, groupName: 'dB Clubs' });
      const existingGroupRecipient = createMockRecipient({
        achievement: createMockDefinition({ thresholdValue: 130, groupName: 'dB Clubs', name: 'dB Club 130' }),
      });
      const createdRecipient = createMockRecipient();

      // loadProfile
      mockEm.findOne
        .mockResolvedValueOnce({ id: 'profile-1', email: 'test@example.com', meca_id: '12345' } as any)
        // isActiveMember
        .mockResolvedValueOnce({ id: 'mem-1' } as any)
        // findOne(AchievementDefinition)
        .mockResolvedValueOnce(def as any)
        // findOne(AchievementRecipient) - no exact match
        .mockResolvedValueOnce(null)
        // findOne(AchievementRecipient) - existing in group (lower)
        .mockResolvedValueOnce(existingGroupRecipient as any);

      mockEm.create.mockReturnValue(createdRecipient as any);

      const result = await service.manualAwardAchievement({
        profile_id: 'profile-1',
        achievement_id: 'def-1',
        achieved_value: 145,
      });

      // Should remove the lower achievement
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(existingGroupRecipient);
      // Should create new one
      expect(mockEm.create).toHaveBeenCalled();
      expect(result).toBe(createdRecipient);
    });

    it('should throw BadRequestException when member already has higher group achievement', async () => {
      const def = createMockDefinition({ thresholdValue: 130, groupName: 'dB Clubs' });
      const existingGroupRecipient = createMockRecipient({
        achievement: createMockDefinition({ thresholdValue: 140, groupName: 'dB Clubs', name: 'dB Club 140' }),
      });

      // loadProfile
      mockEm.findOne
        .mockResolvedValueOnce({ id: 'profile-1', email: 'test@example.com', meca_id: '12345' } as any)
        // isActiveMember
        .mockResolvedValueOnce({ id: 'mem-1' } as any)
        // findOne(AchievementDefinition)
        .mockResolvedValueOnce(def as any)
        // findOne(AchievementRecipient) - no exact match
        .mockResolvedValueOnce(null)
        // findOne(AchievementRecipient) - existing in group (higher)
        .mockResolvedValueOnce(existingGroupRecipient as any);

      await expect(
        service.manualAwardAchievement({
          profile_id: 'profile-1',
          achievement_id: 'def-1',
          achieved_value: 135,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ================================================================
  // getEligibleProfilesForAchievement
  // ================================================================

  describe('getEligibleProfilesForAchievement', () => {
    it('should throw NotFoundException when achievement not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(
        service.getEligibleProfilesForAchievement('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return eligible profiles sorted by name', async () => {
      const def = createMockDefinition({ groupName: undefined });
      mockEm.findOne.mockResolvedValue(def as any);

      // em.find for memberships
      mockEm.find
        .mockResolvedValueOnce([
          { id: 'mem-1', user: { id: 'profile-1' }, membershipTypeConfig: {} },
          { id: 'mem-2', user: { id: 'profile-2' }, membershipTypeConfig: {} },
        ] as any)
        // em.find for existing recipients
        .mockResolvedValueOnce([] as any)
        // em.find for profiles (loadProfiles)
        .mockResolvedValueOnce([
          { id: 'profile-1', first_name: 'Zara', last_name: 'Smith', email: 'zara@example.com', meca_id: '111' },
          { id: 'profile-2', first_name: 'Alice', last_name: 'Jones', email: 'alice@example.com', meca_id: '222' },
        ] as any);

      const result = await service.getEligibleProfilesForAchievement('def-1');

      expect(result).toHaveLength(2);
      // Should be sorted by name alphabetically
      expect(result[0].name).toBe('Alice Jones');
      expect(result[1].name).toBe('Zara Smith');
    });

    it('should filter out profiles that already have the achievement', async () => {
      const def = createMockDefinition({ groupName: undefined });
      mockEm.findOne.mockResolvedValue(def as any);

      // Memberships
      mockEm.find
        .mockResolvedValueOnce([
          { id: 'mem-1', user: { id: 'profile-1' }, membershipTypeConfig: {} },
          { id: 'mem-2', user: { id: 'profile-2' }, membershipTypeConfig: {} },
        ] as any)
        // Existing recipients (profile-1 already has it)
        .mockResolvedValueOnce([
          { profile: { id: 'profile-1' } },
        ] as any)
        // Profiles
        .mockResolvedValueOnce([
          { id: 'profile-2', first_name: 'Alice', last_name: 'Jones', email: 'alice@example.com', meca_id: '222' },
        ] as any);

      const result = await service.getEligibleProfilesForAchievement('def-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('profile-2');
    });

    it('should apply search filter', async () => {
      const def = createMockDefinition({ groupName: undefined });
      mockEm.findOne.mockResolvedValue(def as any);

      mockEm.find
        .mockResolvedValueOnce([
          { id: 'mem-1', user: { id: 'profile-1' }, membershipTypeConfig: {} },
          { id: 'mem-2', user: { id: 'profile-2' }, membershipTypeConfig: {} },
        ] as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([
          { id: 'profile-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', meca_id: '111' },
          { id: 'profile-2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', meca_id: '222' },
        ] as any);

      const result = await service.getEligibleProfilesForAchievement('def-1', 'doe');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should limit results to 50', async () => {
      const def = createMockDefinition({ groupName: undefined });
      mockEm.findOne.mockResolvedValue(def as any);

      // Create 60 memberships
      const memberships = Array.from({ length: 60 }, (_, i) => ({
        id: `mem-${i}`,
        user: { id: `profile-${i}` },
        membershipTypeConfig: {},
      }));

      const profiles = Array.from({ length: 60 }, (_, i) => ({
        id: `profile-${i}`,
        first_name: `User${String(i).padStart(2, '0')}`,
        last_name: 'Test',
        email: `user${i}@example.com`,
        meca_id: `${1000 + i}`,
      }));

      mockEm.find
        .mockResolvedValueOnce(memberships as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce(profiles as any);

      const result = await service.getEligibleProfilesForAchievement('def-1');

      expect(result).toHaveLength(50);
    });
  });

  // ================================================================
  // backfillAchievements
  // ================================================================

  describe('backfillAchievements', () => {
    it('should return zero counts when no results exist', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.backfillAchievements();

      expect(result).toEqual({ processed: 0, awarded: 0, total: 0 });
    });

    it('should apply date filters when provided', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');
      mockEm.find.mockResolvedValue([]);

      await service.backfillAchievements({ startDate, endDate });

      expect(mockEm.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          competitor: { $ne: null },
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        }),
        expect.anything(),
      );
    });
  });

  // ================================================================
  // backfillAchievementsWithProgress
  // ================================================================

  describe('backfillAchievementsWithProgress', () => {
    it('should yield initial progress and complete message', async () => {
      mockEm.find.mockResolvedValue([]);

      const generator = service.backfillAchievementsWithProgress();
      const updates: any[] = [];

      for await (const update of generator) {
        updates.push(update);
      }

      expect(updates).toHaveLength(2);
      expect(updates[0]).toEqual({
        type: 'progress',
        processed: 0,
        awarded: 0,
        total: 0,
        percentage: 0,
      });
      expect(updates[1]).toEqual({
        type: 'complete',
        processed: 0,
        awarded: 0,
        total: 0,
        percentage: 100,
      });
    });
  });

  // ================================================================
  // serializeDefinition (tested via public methods)
  // ================================================================

  describe('serializeDefinition (via getAllDefinitions)', () => {
    it('should handle null values correctly', async () => {
      const def = createMockDefinition({
        description: undefined,
        groupName: undefined,
        renderValue: undefined,
        format: undefined,
        classFilter: undefined,
        divisionFilter: undefined,
        pointsMultiplier: undefined,
      });
      (mockEm as any).findAndCount.mockResolvedValue([[def], 1]);

      const result = await service.getAllDefinitions({} as any);
      const item = result.items[0];

      expect(item.description).toBeNull();
      expect(item.group_name).toBeNull();
      expect(item.render_value).toBeNull();
      expect(item.format).toBeNull();
      expect(item.class_filter).toBeNull();
      expect(item.division_filter).toBeNull();
      expect(item.points_multiplier).toBeNull();
    });
  });
});
