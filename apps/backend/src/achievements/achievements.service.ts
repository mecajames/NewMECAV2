import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { AchievementDefinition } from './achievement-definition.entity';
import { AchievementRecipient } from './achievement-recipient.entity';
import { AchievementTemplate } from './achievement-template.entity';
import { AchievementImageService } from './image-generator/achievement-image.service';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Profile } from '../profiles/profiles.entity';
import {
  CreateAchievementDefinitionDto,
  UpdateAchievementDefinitionDto,
  GetAchievementDefinitionsQuery,
  GetAchievementRecipientsQuery,
  ThresholdOperator,
  AchievementMetricType,
  AchievementType,
  MemberAchievement,
} from '@newmeca/shared';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly em: EntityManager,
    @Inject(forwardRef(() => AchievementImageService))
    private readonly imageService: AchievementImageService,
  ) {}

  // =============================================================================
  // Achievement Definitions CRUD
  // =============================================================================

  async getAllDefinitions(query: GetAchievementDefinitionsQuery) {
    const { format, competition_type, is_active } = query;
    // Ensure page and limit are numbers (HTTP query params come as strings)
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const where: FilterQuery<AchievementDefinition> = {};

    if (format) {
      where.format = format;
    }
    if (competition_type) {
      where.competitionType = competition_type;
    }
    if (is_active !== undefined) {
      where.isActive = is_active;
    }

    const [items, total] = await this.em.findAndCount(AchievementDefinition, where, {
      // Sort by: group name, competition type, then threshold (lowest to highest)
      orderBy: { groupName: 'ASC', competitionType: 'ASC', thresholdValue: 'ASC' },
      limit,
      offset: (page - 1) * limit,
    });

    return {
      items: items.map((item) => this.serializeDefinition(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDefinitionById(id: string) {
    const definition = await this.em.findOne(AchievementDefinition, { id });
    if (!definition) {
      throw new NotFoundException(`Achievement definition with ID ${id} not found`);
    }
    return this.serializeDefinition(definition);
  }

  async createDefinition(dto: CreateAchievementDefinitionDto) {
    const now = new Date();

    // Default render_value to threshold_value if not provided (common for dB Club achievements)
    const renderValue = dto.render_value ?? (dto.metric_type === AchievementMetricType.SCORE ? Math.floor(dto.threshold_value) : dto.threshold_value);

    this.logger.log(`Creating achievement definition: name=${dto.name}, threshold=${dto.threshold_value}, render_value=${renderValue}`);

    const definition = this.em.create(AchievementDefinition, {
      name: dto.name,
      description: dto.description,
      groupName: dto.group_name,
      achievementType: dto.achievement_type || AchievementType.DYNAMIC,
      templateKey: dto.template_key,
      renderValue: renderValue,
      format: dto.format,
      competitionType: dto.competition_type,
      metricType: dto.metric_type,
      thresholdValue: dto.threshold_value,
      thresholdOperator: dto.threshold_operator || ThresholdOperator.GREATER_THAN_OR_EQUAL,
      classFilter: dto.class_filter,
      divisionFilter: dto.division_filter,
      pointsMultiplier: dto.points_multiplier,
      isActive: dto.is_active ?? true,
      displayOrder: dto.display_order ?? 0,
      createdAt: now,
      updatedAt: now,
    });

    await this.em.persistAndFlush(definition);
    return this.serializeDefinition(definition);
  }

  async updateDefinition(id: string, dto: UpdateAchievementDefinitionDto) {
    const definition = await this.em.findOne(AchievementDefinition, { id });
    if (!definition) {
      throw new NotFoundException(`Achievement definition with ID ${id} not found`);
    }

    if (dto.name !== undefined) definition.name = dto.name;
    if (dto.description !== undefined) definition.description = dto.description;
    if (dto.group_name !== undefined) definition.groupName = dto.group_name ?? undefined;
    if (dto.achievement_type !== undefined) definition.achievementType = dto.achievement_type;
    if (dto.template_key !== undefined) definition.templateKey = dto.template_key;
    if (dto.render_value !== undefined) definition.renderValue = dto.render_value ?? undefined;
    if (dto.format !== undefined) definition.format = dto.format ?? undefined;
    if (dto.competition_type !== undefined) definition.competitionType = dto.competition_type;
    if (dto.metric_type !== undefined) definition.metricType = dto.metric_type;
    if (dto.threshold_value !== undefined) definition.thresholdValue = dto.threshold_value;
    if (dto.threshold_operator !== undefined) definition.thresholdOperator = dto.threshold_operator;
    if (dto.class_filter !== undefined) definition.classFilter = dto.class_filter ?? undefined;
    if (dto.division_filter !== undefined) definition.divisionFilter = dto.division_filter ?? undefined;
    if (dto.points_multiplier !== undefined) definition.pointsMultiplier = dto.points_multiplier ?? undefined;
    if (dto.is_active !== undefined) definition.isActive = dto.is_active;
    if (dto.display_order !== undefined) definition.displayOrder = dto.display_order;

    await this.em.flush();
    return this.serializeDefinition(definition);
  }

  async deleteDefinition(id: string) {
    const definition = await this.em.findOne(AchievementDefinition, { id });
    if (!definition) {
      throw new NotFoundException(`Achievement definition with ID ${id} not found`);
    }

    await this.em.removeAndFlush(definition);
    return { success: true };
  }

  // =============================================================================
  // Achievement Recipients
  // =============================================================================

  async getRecipients(query: GetAchievementRecipientsQuery) {
    const { achievement_id, profile_id, meca_id, season_id, search } = query;
    // Ensure page and limit are numbers (HTTP query params come as strings)
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const em = this.em.fork();

    const where: FilterQuery<AchievementRecipient> = {};

    if (achievement_id) {
      where.achievement = { id: achievement_id };
    }
    if (profile_id) {
      where.profile = { id: profile_id };
    }
    if (meca_id) {
      where.mecaId = meca_id;
    }
    if (season_id) {
      where.season = { id: season_id };
    }
    if (search) {
      where.$or = [
        { mecaId: { $ilike: `%${search}%` } },
        { profile: { first_name: { $ilike: `%${search}%` } } },
        { profile: { last_name: { $ilike: `%${search}%` } } },
      ] as any;
    }

    const [items, total] = await em.findAndCount(AchievementRecipient, where, {
      populate: ['achievement', 'profile', 'event', 'season'],
      orderBy: { achievedAt: 'DESC' },
      limit,
      offset: (page - 1) * limit,
    });

    return {
      items: items.map((item) => this.serializeRecipient(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAchievementsForProfile(profileId: string): Promise<MemberAchievement[]> {
    const recipients = await this.em.find(
      AchievementRecipient,
      { profile: { id: profileId } },
      {
        populate: ['achievement', 'event'],
        orderBy: { achievedAt: 'DESC' },
      }
    );

    return recipients.map((r) => ({
      id: r.id,
      achievement_name: r.achievement.name,
      achievement_description: r.achievement.description ?? null,
      template_key: r.achievement.templateKey,
      format: r.achievement.format ?? null,
      competition_type: r.achievement.competitionType,
      achieved_value: Number(r.achievedValue),
      threshold_value: Number(r.achievement.thresholdValue),
      achieved_at: r.achievedAt,
      event_name: r.event?.title ?? null,
      image_url: r.imageUrl ?? null,
    }));
  }

  async getAchievementsForMecaId(mecaId: string): Promise<MemberAchievement[]> {
    const recipients = await this.em.find(
      AchievementRecipient,
      { mecaId },
      {
        populate: ['achievement', 'event'],
        orderBy: { achievedAt: 'DESC' },
      }
    );

    return recipients.map((r) => ({
      id: r.id,
      achievement_name: r.achievement.name,
      achievement_description: r.achievement.description ?? null,
      template_key: r.achievement.templateKey,
      format: r.achievement.format ?? null,
      competition_type: r.achievement.competitionType,
      achieved_value: Number(r.achievedValue),
      threshold_value: Number(r.achievement.thresholdValue),
      achieved_at: r.achievedAt,
      event_name: r.event?.title ?? null,
      image_url: r.imageUrl ?? null,
    }));
  }

  // =============================================================================
  // Achievement Templates
  // =============================================================================

  async getAllTemplates() {
    const templates = await this.em.find(AchievementTemplate, { isActive: true }, { orderBy: { name: 'ASC' } });
    return templates.map((t) => this.serializeTemplate(t));
  }

  async getTemplateByKey(key: string) {
    const template = await this.em.findOne(AchievementTemplate, { key });
    if (!template) {
      throw new NotFoundException(`Achievement template with key ${key} not found`);
    }
    return this.serializeTemplate(template);
  }

  // =============================================================================
  // Auto-Award Logic
  // =============================================================================

  /**
   * Check if a competition result qualifies for any achievements and award them.
   * Called after a competition result is created or updated.
   *
   * Logic: ONE achievement per competition type (group_name).
   * Awards the HIGHEST qualifying threshold (rounded DOWN).
   * If member already has an achievement in that group, only upgrade if new is higher.
   */
  async checkAndAwardAchievements(resultId: string): Promise<AchievementRecipient[]> {
    const result = await this.em.findOne(CompetitionResult, { id: resultId }, {
      populate: ['competitor', 'event', 'season'],
    });

    if (!result) {
      this.logger.warn(`Competition result ${resultId} not found for achievement check`);
      return [];
    }

    // Skip if no competitor linked (guest entry)
    if (!result.competitor) {
      this.logger.debug(`Skipping achievement check for result ${resultId} - no competitor linked`);
      return [];
    }

    // Get all active achievement definitions
    const definitions = await this.em.find(AchievementDefinition, {
      isActive: true,
    }, {
      orderBy: { thresholdValue: 'DESC' }, // Highest thresholds first
    });

    // Group definitions by group_name
    const defsByGroup = new Map<string, AchievementDefinition[]>();
    for (const def of definitions) {
      const group = def.groupName || def.competitionType;
      if (!defsByGroup.has(group)) {
        defsByGroup.set(group, []);
      }
      defsByGroup.get(group)!.push(def);
    }

    const awardedAchievements: AchievementRecipient[] = [];
    const score = Number(result.score);

    // Check each achievement group
    for (const [groupName, groupDefs] of defsByGroup) {
      // Check if this result matches any definition in this group
      const matchingDef = groupDefs.find(def => this.matchesCompetitionType(result, def));
      if (!matchingDef) continue;

      // Get all thresholds for this group
      const thresholds = groupDefs.map(d => Number(d.thresholdValue));

      // Find the highest threshold this score qualifies for (rounded DOWN)
      const qualifyingThreshold = this.findHighestQualifyingThreshold(score, thresholds);
      if (!qualifyingThreshold) continue;

      // Find the definition for this threshold
      const targetDef = groupDefs.find(d => Number(d.thresholdValue) === qualifyingThreshold);
      if (!targetDef) continue;

      // Check if member already has an achievement in this group
      const existingRecipient = await this.em.findOne(AchievementRecipient, {
        profile: { id: result.competitor.id },
        achievement: { groupName: groupName },
      }, {
        populate: ['achievement'],
      });

      if (existingRecipient) {
        // Only upgrade if new threshold is higher
        const existingThreshold = Number(existingRecipient.achievement.thresholdValue);
        if (qualifyingThreshold <= existingThreshold) {
          this.logger.debug(
            `Skipping "${targetDef.name}" for ${result.competitor.email} - ` +
            `already has ${existingThreshold}+ in ${groupName}`
          );
          continue;
        }

        // Delete the old achievement to upgrade
        this.logger.log(
          `Upgrading ${groupName} achievement for ${result.competitor.email}: ` +
          `${existingThreshold}+ -> ${qualifyingThreshold}+`
        );
        await this.em.removeAndFlush(existingRecipient);
      }

      // Award the achievement!
      const now = new Date();
      const recipient = this.em.create(AchievementRecipient, {
        achievement: targetDef,
        profile: result.competitor,
        mecaId: result.mecaId,
        achievedValue: score,
        achievedAt: now,
        competitionResult: result,
        event: result.event,
        season: result.season,
        createdAt: now,
      });

      await this.em.persistAndFlush(recipient);
      awardedAchievements.push(recipient);

      this.logger.log(
        `Awarded achievement "${targetDef.name}" to ${result.competitor.email} ` +
        `(score: ${score}, threshold: ${qualifyingThreshold}+)`
      );
    }

    return awardedAchievements;
  }

  /**
   * Find the highest threshold that a score qualifies for (rounded DOWN).
   * E.g., score 153.4 with thresholds [150, 155, 160] returns 150.
   */
  private findHighestQualifyingThreshold(score: number, thresholds: number[]): number | null {
    const sorted = [...thresholds].sort((a, b) => b - a); // Sort descending
    for (const threshold of sorted) {
      if (score >= threshold) {
        return threshold;
      }
    }
    return null;
  }

  /**
   * Backfill achievements for all existing competition results.
   * This should be called once after the initial migration.
   * Automatically generates images for newly awarded achievements.
   */
  async backfillAchievements(): Promise<{ processed: number; awarded: number; imagesGenerated: number; imagesFailed: number }> {
    this.logger.log('Starting achievement backfill...');

    // Get all competition results with linked competitors
    const results = await this.em.find(
      CompetitionResult,
      { competitor: { $ne: null } },
      { populate: ['competitor', 'event', 'season'], orderBy: { score: 'DESC' } }
    );

    let processed = 0;
    let awarded = 0;

    for (const result of results) {
      processed++;
      const newAwards = await this.checkAndAwardAchievements(result.id);
      awarded += newAwards.length;

      if (processed % 100 === 0) {
        this.logger.log(`Backfill progress: ${processed}/${results.length} results processed, ${awarded} awards given`);
      }
    }

    this.logger.log(`Achievement awarding complete: ${processed} results processed, ${awarded} achievements awarded`);

    // Now generate images for all recipients that don't have one
    this.logger.log('Generating images for achievements...');
    const imageResult = await this.imageService.generateMissingImages();

    this.logger.log(`Backfill complete: ${processed} results processed, ${awarded} achievements awarded, ` +
      `${imageResult.generated} images generated, ${imageResult.failed} image failures`);

    return {
      processed,
      awarded,
      imagesGenerated: imageResult.generated,
      imagesFailed: imageResult.failed,
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private matchesCompetitionType(result: CompetitionResult, definition: AchievementDefinition): boolean {
    // If class_filter is defined, use EXACT matching (case-insensitive)
    if (definition.classFilter && definition.classFilter.length > 0) {
      const resultClass = (result.competitionClass || '').toLowerCase().trim();
      // Check if result's class EXACTLY matches one of the allowed classes
      const classMatches = definition.classFilter.some(allowedClass =>
        resultClass === allowedClass.toLowerCase().trim()
      );

      if (!classMatches) {
        return false;
      }

      // Also check points_multiplier if specified (for Dueling Demos Certified 360 Sound)
      if (definition.pointsMultiplier) {
        const resultMultiplier = (result as any).pointsMultiplier || 1;
        if (resultMultiplier < definition.pointsMultiplier) {
          return false;
        }
      }

      return true;
    }

    // Fallback to legacy pattern matching if no class_filter defined
    const classLower = result.competitionClass?.toLowerCase() || '';
    const competitionType = definition.competitionType.toLowerCase();
    const formatLower = (result.format || '').toLowerCase();

    // Radical X - specific class name contains "radical"
    if (competitionType.includes('radical x') || competitionType.includes('radx')) {
      return classLower.includes('radical');
    }

    // Park and Pound - class contains "park" or "pound"
    if (competitionType.includes('park and pound')) {
      return classLower.includes('park') && classLower.includes('pound');
    }

    // Dueling Demos - Certified 360 Sound - class contains "360" or "c360s"
    if (competitionType.includes('certified 360 sound') || competitionType.includes('c360s')) {
      return classLower.includes('360') || classLower.includes('c360');
    }

    // Dueling Demos - class contains "duel" or "demo" (but NOT 360 sound)
    if (competitionType.includes('dueling demos')) {
      const is360Sound = classLower.includes('360') || classLower.includes('c360');
      return (classLower.includes('duel') || classLower.includes('demo')) && !is360Sound;
    }

    // Certified Sound (SQL format) - class contains "install" or format is SQL
    if (competitionType.includes('certified sound')) {
      return classLower.includes('install') || formatLower === 'sql';
    }

    // Certified at the Headrest (CATH) - DEFAULT for SPL classes
    if (competitionType.includes('certified at the headrest')) {
      const isRadical = classLower.includes('radical');
      const isParkPound = classLower.includes('park') && classLower.includes('pound');
      const isDueling = classLower.includes('duel') || classLower.includes('demo');
      const isSQL = classLower.includes('install') || formatLower === 'sql';
      const isKids = classLower.includes('kids');

      return !isRadical && !isParkPound && !isDueling && !isSQL && !isKids;
    }

    return false;
  }

  private evaluateThreshold(value: number, operator: ThresholdOperator, threshold: number): boolean {
    switch (operator) {
      case ThresholdOperator.GREATER_THAN:
        return value > threshold;
      case ThresholdOperator.GREATER_THAN_OR_EQUAL:
        return value >= threshold;
      case ThresholdOperator.EQUAL:
        return value === threshold;
      case ThresholdOperator.LESS_THAN:
        return value < threshold;
      case ThresholdOperator.LESS_THAN_OR_EQUAL:
        return value <= threshold;
      default:
        return false;
    }
  }

  private serializeDefinition(definition: AchievementDefinition) {
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description ?? null,
      group_name: definition.groupName ?? null,
      achievement_type: definition.achievementType,
      template_key: definition.templateKey,
      render_value: definition.renderValue ? Number(definition.renderValue) : null,
      format: definition.format ?? null,
      competition_type: definition.competitionType,
      metric_type: definition.metricType,
      threshold_value: Number(definition.thresholdValue),
      threshold_operator: definition.thresholdOperator,
      class_filter: definition.classFilter ?? null,
      division_filter: definition.divisionFilter ?? null,
      points_multiplier: definition.pointsMultiplier ?? null,
      is_active: definition.isActive,
      display_order: definition.displayOrder,
      created_at: definition.createdAt,
      updated_at: definition.updatedAt,
    };
  }

  private serializeRecipient(recipient: AchievementRecipient) {
    const profile = recipient.profile;

    // Build profile name - prioritize first_name + last_name, fall back to full_name
    let profileName: string | null = null;
    if (profile) {
      const firstName = profile.first_name;
      const lastName = profile.last_name;
      const fullName = profile.full_name;

      if (firstName || lastName) {
        profileName = [firstName, lastName].filter(Boolean).join(' ');
      } else if (fullName) {
        profileName = fullName;
      }
    }

    return {
      id: recipient.id,
      achievement_id: recipient.achievement?.id ?? null,
      profile_id: recipient.profile?.id ?? null,
      profile_name: profileName,
      meca_id: recipient.mecaId ?? null,
      achieved_value: Number(recipient.achievedValue),
      achieved_at: recipient.achievedAt,
      competition_result_id: recipient.competitionResult?.id ?? null,
      event_id: recipient.event?.id ?? null,
      season_id: recipient.season?.id ?? null,
      season_name: recipient.season?.name ?? null,
      image_url: recipient.imageUrl ?? null,
      image_generated_at: recipient.imageGeneratedAt ?? null,
      created_at: recipient.createdAt,
      achievement: recipient.achievement ? this.serializeDefinition(recipient.achievement) : undefined,
    };
  }

  private serializeTemplate(template: AchievementTemplate) {
    return {
      id: template.id,
      key: template.key,
      name: template.name,
      base_image_path: template.baseImagePath,
      font_size: template.fontSize,
      text_x: template.textX,
      text_y: template.textY,
      text_color: template.textColor,
      is_active: template.isActive,
    };
  }
}
