import { Injectable, Logger, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { AchievementDefinition } from './achievement-definition.entity';
import { AchievementRecipient } from './achievement-recipient.entity';
import { AchievementTemplate } from './achievement-template.entity';
import { AchievementImageService } from './image-generator/achievement-image.service';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';
import { Event } from '../events/events.entity';
import { Season } from '../seasons/seasons.entity';
import {
  CreateAchievementDefinitionDto,
  UpdateAchievementDefinitionDto,
  GetAchievementDefinitionsQuery,
  GetAchievementRecipientsQuery,
  ThresholdOperator,
  AchievementMetricType,
  AchievementType,
  MemberAchievement,
  PaymentStatus,
  MembershipCategory,
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
  // Membership Eligibility Check
  // =============================================================================

  /**
   * Check if a profile has an active membership eligible for achievements.
   * Only Competitor, Retailer, and Manufacturer memberships qualify.
   */
  private async isActiveMember(profileId: string): Promise<boolean> {
    const em = this.em.fork();

    // Find active membership for this profile
    // Must be: paid, not expired, not cancelled, and in eligible category
    const now = new Date();
    const activeMembership = await em.findOne(Membership, {
      user: { id: profileId },
      paymentStatus: PaymentStatus.PAID,
      membershipTypeConfig: {
        category: { $in: [MembershipCategory.COMPETITOR, MembershipCategory.RETAIL, MembershipCategory.MANUFACTURER] },
      },
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
      ],
      $and: [
        { $or: [{ cancelledAt: null }, { cancelAtPeriodEnd: true, endDate: { $gte: now } }] },
      ],
    }, {
      populate: ['membershipTypeConfig'],
    });

    return !!activeMembership;
  }

  /**
   * Check if a MECA ID belongs to an active member.
   */
  private async isActiveMemberByMecaId(mecaId: string): Promise<boolean> {
    if (!mecaId || mecaId === '0' || mecaId === '999999' || mecaId.startsWith('99')) {
      return false;
    }

    const em = this.em.fork();

    // Find profile by MECA ID
    const profile = await em.findOne(Profile, { meca_id: mecaId });
    if (!profile) {
      return false;
    }

    return this.isActiveMember(profile.id);
  }

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
    const { achievement_id, profile_id, meca_id, season_id, search, group_name } = query;
    // Ensure page and limit are numbers (HTTP query params come as strings)
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const em = this.em.fork();

    const where: FilterQuery<AchievementRecipient> = {};
    const achievementWhere: any = {};

    if (achievement_id) {
      achievementWhere.id = achievement_id;
    }
    if (group_name) {
      this.logger.log(`Filtering recipients by group_name: ${group_name}`);
      achievementWhere.groupName = group_name;
    }

    // Apply achievement filters if any
    if (Object.keys(achievementWhere).length > 0) {
      where.achievement = achievementWhere;
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

    this.logger.log(`Recipients filter: ${JSON.stringify(where)}`);

    let items: AchievementRecipient[] = [];
    let total = 0;

    try {
      [items, total] = await em.findAndCount(AchievementRecipient, where, {
        populate: ['achievement', 'profile', 'event', 'season'],
        orderBy: { achievedAt: 'DESC' },
        limit,
        offset: (page - 1) * limit,
      });
    } catch (err) {
      this.logger.error(`Failed to query achievement recipients: ${err}`);
      // Return empty results rather than crashing the endpoint
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const serializedItems = [];
    for (const item of items) {
      try {
        serializedItems.push(this.serializeRecipient(item));
      } catch (err) {
        this.logger.error(`Failed to serialize recipient ${item.id}: ${err}`);
      }
    }

    return {
      items: serializedItems,
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

    // Get all unique template keys and fetch templates
    const templateKeys = [...new Set(recipients.map(r => r.achievement.templateKey))];
    const templates = await this.em.find(AchievementTemplate, { key: { $in: templateKeys } });
    const templateMap = new Map(templates.map(t => [t.key, t]));

    // Build base URL for template images
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';

    return recipients.map((r) => {
      const template = templateMap.get(r.achievement.templateKey);
      // Use render_value from definition if set, otherwise use achieved_value
      const renderValue = r.achievement.renderValue ?? Number(r.achievedValue);

      return {
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
        // Template info for CSS overlay
        template_base_image_url: template ? `${supabaseUrl}/storage/v1/object/public/achievement-images/templates/${template.baseImagePath}` : null,
        template_font_size: template?.fontSize ?? null,
        template_text_x: template?.textX ?? null,
        template_text_y: template?.textY ?? null,
        template_text_color: template?.textColor ?? null,
        render_value: renderValue,
      };
    });
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

    // Get all unique template keys and fetch templates
    const templateKeys = [...new Set(recipients.map(r => r.achievement.templateKey))];
    const templates = await this.em.find(AchievementTemplate, { key: { $in: templateKeys } });
    const templateMap = new Map(templates.map(t => [t.key, t]));

    // Build base URL for template images
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';

    return recipients.map((r) => {
      const template = templateMap.get(r.achievement.templateKey);
      // Use render_value from definition if set, otherwise use achieved_value
      const renderValue = r.achievement.renderValue ?? Number(r.achievedValue);

      return {
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
        // Template info for CSS overlay
        template_base_image_url: template ? `${supabaseUrl}/storage/v1/object/public/achievement-images/templates/${template.baseImagePath}` : null,
        template_font_size: template?.fontSize ?? null,
        template_text_x: template?.textX ?? null,
        template_text_y: template?.textY ?? null,
        template_text_color: template?.textColor ?? null,
        render_value: renderValue,
      };
    });
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

    // Skip if member does not have an active membership
    const isActive = await this.isActiveMember(result.competitor.id);
    if (!isActive) {
      this.logger.debug(`Skipping achievement check for result ${resultId} - member ${result.competitor.email} is not an active member`);
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
  /**
   * Re-check achievements with optional date filtering
   * Returns final result (for non-streaming calls)
   */
  async backfillAchievements(options?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ processed: number; awarded: number; total: number }> {
    const { startDate, endDate } = options || {};

    this.logger.log(`Starting achievement re-check...${startDate ? ` from ${startDate.toISOString()}` : ''}${endDate ? ` to ${endDate.toISOString()}` : ''}`);

    // Build filter for competition results
    const where: any = { competitor: { $ne: null } };

    // Add date filtering if provided
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.$gte = startDate;
      }
      if (endDate) {
        where.createdAt.$lte = endDate;
      }
    }

    // Get competition results with linked competitors
    const results = await this.em.find(
      CompetitionResult,
      where,
      { populate: ['competitor', 'event', 'season'], orderBy: { score: 'DESC' } }
    );

    const total = results.length;
    let processed = 0;
    let awarded = 0;

    for (const result of results) {
      processed++;
      const newAwards = await this.checkAndAwardAchievements(result.id);
      awarded += newAwards.length;

      if (processed % 100 === 0) {
        this.logger.log(`Re-check progress: ${processed}/${total} results processed, ${awarded} awards given`);
      }
    }

    this.logger.log(`Re-check complete: ${processed} results processed, ${awarded} achievements awarded`);

    return {
      processed,
      awarded,
      total,
    };
  }

  /**
   * Re-check achievements with streaming progress updates
   * Yields progress updates for SSE streaming
   */
  async *backfillAchievementsWithProgress(options?: {
    startDate?: Date;
    endDate?: Date;
  }): AsyncGenerator<{ type: 'progress' | 'complete'; processed: number; awarded: number; total: number; percentage: number }> {
    const { startDate, endDate } = options || {};

    this.logger.log(`Starting achievement re-check with progress...${startDate ? ` from ${startDate.toISOString()}` : ''}${endDate ? ` to ${endDate.toISOString()}` : ''}`);

    // Build filter for competition results
    const where: any = { competitor: { $ne: null } };

    // Add date filtering if provided
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.$gte = startDate;
      }
      if (endDate) {
        where.createdAt.$lte = endDate;
      }
    }

    // Get competition results with linked competitors
    const results = await this.em.find(
      CompetitionResult,
      where,
      { populate: ['competitor', 'event', 'season'], orderBy: { score: 'DESC' } }
    );

    const total = results.length;
    let processed = 0;
    let awarded = 0;

    // Yield initial progress
    yield {
      type: 'progress',
      processed: 0,
      awarded: 0,
      total,
      percentage: 0,
    };

    for (const result of results) {
      processed++;
      const newAwards = await this.checkAndAwardAchievements(result.id);
      awarded += newAwards.length;

      // Yield progress update every 10 results or at the end
      if (processed % 10 === 0 || processed === total) {
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 100;
        yield {
          type: 'progress',
          processed,
          awarded,
          total,
          percentage,
        };
      }
    }

    this.logger.log(`Re-check complete: ${processed} results processed, ${awarded} achievements awarded`);

    // Yield final complete message
    yield {
      type: 'complete',
      processed,
      awarded,
      total,
      percentage: 100,
    };
  }

  // =============================================================================
  // Manual Award (Admin)
  // =============================================================================

  /**
   * Manually award an achievement to a profile (admin only).
   * This bypasses the normal score-based logic but still checks for active membership.
   */
  async manualAwardAchievement(dto: {
    profile_id: string;
    achievement_id: string;
    achieved_value: number;
    notes?: string;
  }): Promise<AchievementRecipient> {
    const { profile_id, achievement_id, achieved_value, notes } = dto;
    const em = this.em.fork();

    // Get the profile
    const profile = await em.findOne(Profile, { id: profile_id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profile_id} not found`);
    }

    // Check if profile has active membership
    const isActive = await this.isActiveMember(profile_id);
    if (!isActive) {
      throw new BadRequestException(`Member ${profile.email || profile.meca_id} does not have an active membership`);
    }

    // Get the achievement definition
    const achievement = await em.findOne(AchievementDefinition, { id: achievement_id });
    if (!achievement) {
      throw new NotFoundException(`Achievement definition with ID ${achievement_id} not found`);
    }

    // Check if member already has this specific achievement
    const existingRecipient = await em.findOne(AchievementRecipient, {
      profile: { id: profile_id },
      achievement: { id: achievement_id },
    });

    if (existingRecipient) {
      throw new BadRequestException(`Member already has the "${achievement.name}" achievement`);
    }

    // Check if member already has a higher achievement in this group
    if (achievement.groupName) {
      const existingInGroup = await em.findOne(AchievementRecipient, {
        profile: { id: profile_id },
        achievement: { groupName: achievement.groupName },
      }, {
        populate: ['achievement'],
      });

      if (existingInGroup) {
        const existingThreshold = Number(existingInGroup.achievement.thresholdValue);
        const newThreshold = Number(achievement.thresholdValue);

        if (existingThreshold >= newThreshold) {
          throw new BadRequestException(
            `Member already has a higher or equal achievement in the "${achievement.groupName}" group: ` +
            `${existingInGroup.achievement.name} (${existingThreshold}+)`
          );
        }

        // Remove the lower achievement to upgrade
        this.logger.log(`Manual award: Removing lower achievement "${existingInGroup.achievement.name}" for ${profile.email}`);
        await em.removeAndFlush(existingInGroup);
      }
    }

    // Create the award
    const now = new Date();
    const recipient = em.create(AchievementRecipient, {
      achievement,
      profile,
      mecaId: profile.meca_id,
      achievedValue: achieved_value,
      achievedAt: now,
      createdAt: now,
    });

    // Log notes for manual awards (not stored in DB yet)
    if (notes) {
      this.logger.log(`Manual award notes: ${notes}`);
    }

    await em.persistAndFlush(recipient);

    this.logger.log(`Manual award: Awarded "${achievement.name}" to ${profile.email || profile.meca_id} (value: ${achieved_value})`);

    return recipient;
  }

  /**
   * Remove an achievement award from a member (admin only).
   * Also deletes any associated image from storage.
   */
  async deleteRecipient(recipientId: string): Promise<{ success: boolean; deleted: { id: string; achievement_name: string; profile_name: string } }> {
    const em = this.em.fork();

    // Get the recipient with related data for logging
    const recipient = await em.findOne(AchievementRecipient, { id: recipientId }, {
      populate: ['achievement', 'profile'],
    });

    if (!recipient) {
      throw new NotFoundException(`Achievement recipient with ID ${recipientId} not found`);
    }

    const achievementName = recipient.achievement?.name || 'Unknown';
    const profileName = recipient.profile
      ? `${recipient.profile.first_name || ''} ${recipient.profile.last_name || ''}`.trim() || recipient.profile.email || 'Unknown'
      : 'Unknown';
    const mecaId = recipient.mecaId || recipient.profile?.meca_id || 'N/A';

    // Delete the image from storage if it exists
    if (recipient.imageUrl) {
      try {
        await this.imageService.deleteImage(recipient.imageUrl);
        this.logger.log(`Deleted achievement image for recipient ${recipientId}`);
      } catch (error) {
        this.logger.warn(`Failed to delete achievement image for recipient ${recipientId}: ${error}`);
        // Continue with deletion even if image deletion fails
      }
    }

    // Delete the recipient record
    await em.removeAndFlush(recipient);

    this.logger.log(`Deleted achievement award: "${achievementName}" from ${profileName} (MECA ID: ${mecaId})`);

    return {
      success: true,
      deleted: {
        id: recipientId,
        achievement_name: achievementName,
        profile_name: profileName,
      },
    };
  }

  /**
   * Get profiles that can receive a specific achievement (for admin dropdown).
   * Returns active members who don't already have this achievement or a higher one in the same group.
   */
  async getEligibleProfilesForAchievement(achievementId: string, search?: string): Promise<Array<{
    id: string;
    meca_id: string;
    name: string;
    email: string;
  }>> {
    const em = this.em.fork();

    // Get the achievement definition
    const achievement = await em.findOne(AchievementDefinition, { id: achievementId });
    if (!achievement) {
      throw new NotFoundException(`Achievement definition with ID ${achievementId} not found`);
    }

    // Get all active memberships (Competitor, Retailer, Manufacturer)
    const now = new Date();
    const activeMemberships = await em.find(Membership, {
      paymentStatus: PaymentStatus.PAID,
      membershipTypeConfig: {
        category: { $in: [MembershipCategory.COMPETITOR, MembershipCategory.RETAIL, MembershipCategory.MANUFACTURER] },
      },
      $or: [
        { endDate: { $gte: now } },
        { endDate: null },
      ],
      $and: [
        { $or: [{ cancelledAt: null }, { cancelAtPeriodEnd: true, endDate: { $gte: now } }] },
      ],
    }, {
      populate: ['user', 'membershipTypeConfig'],
    });

    // Get profiles that already have this achievement or higher in the same group
    const existingRecipients = achievement.groupName
      ? await em.find(AchievementRecipient, {
          achievement: { groupName: achievement.groupName, thresholdValue: { $gte: achievement.thresholdValue } },
        }, { populate: ['profile'] })
      : await em.find(AchievementRecipient, {
          achievement: { id: achievementId },
        }, { populate: ['profile'] });

    const excludedProfileIds = new Set(existingRecipients.map(r => r.profile?.id).filter(Boolean));

    // Filter to eligible profiles (using 'user' which is the Profile relationship on Membership)
    let eligibleProfiles = activeMemberships
      .filter(m => m.user && !excludedProfileIds.has(m.user.id))
      .map(m => ({
        id: m.user.id,
        meca_id: m.user.meca_id || '',
        name: `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() || 'Unknown',
        email: m.user.email || '',
      }));

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      eligibleProfiles = eligibleProfiles.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.meca_id.toLowerCase().includes(searchLower) ||
        p.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort by name and limit results
    return eligibleProfiles
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);
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
    let profile: any = null;
    try {
      profile = recipient.profile;
    } catch {
      // Profile relation not initialized
    }

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

    let achievement: any = null;
    try {
      achievement = recipient.achievement;
    } catch {
      // Achievement relation not initialized
    }

    let serializedAchievement: ReturnType<typeof this.serializeDefinition> | undefined;
    if (achievement) {
      try {
        serializedAchievement = this.serializeDefinition(achievement);
      } catch (err) {
        this.logger.warn(`Failed to serialize achievement for recipient ${recipient.id}: ${err}`);
      }
    }

    // Safely access optional relations that may not be populated
    let competitionResult: any = null;
    try {
      competitionResult = recipient.competitionResult;
    } catch {
      // CompetitionResult relation not initialized
    }

    let event: any = null;
    try {
      event = recipient.event;
    } catch {
      // Event relation not initialized
    }

    let season: any = null;
    try {
      season = recipient.season;
    } catch {
      // Season relation not initialized
    }

    return {
      id: recipient.id,
      achievement_id: achievement?.id ?? null,
      profile_id: profile?.id ?? null,
      profile_name: profileName,
      meca_id: recipient.mecaId ?? null,
      achieved_value: Number(recipient.achievedValue),
      achieved_at: recipient.achievedAt,
      competition_result_id: competitionResult?.id ?? null,
      event_id: event?.id ?? null,
      event_name: event?.title ?? null,
      season_id: season?.id ?? null,
      season_name: season?.name ?? null,
      image_url: recipient.imageUrl ?? null,
      image_generated_at: recipient.imageGeneratedAt ?? null,
      created_at: recipient.createdAt,
      achievement: serializedAchievement,
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
