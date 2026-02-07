import { z } from 'zod';

// =============================================================================
// Achievement System Enums
// =============================================================================

export enum AchievementMetricType {
  SCORE = 'score',
  POINTS = 'points',
}

export enum AchievementType {
  DYNAMIC = 'dynamic',
  STATIC = 'static',
}

export enum ThresholdOperator {
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  EQUAL = '=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
}

export enum AchievementCompetitionType {
  CERTIFIED_AT_THE_HEADREST = 'Certified at the Headrest',
  RADICAL_X = 'Radical X',
  DUELING_DEMOS = 'Dueling Demos',
  DUELING_DEMOS_C360S = 'Dueling Demos - Certified 360 Sound',
  PARK_AND_POUND = 'Park and Pound',
  CERTIFIED_SOUND = 'Certified Sound',
}

export enum AchievementFormat {
  SPL = 'SPL',
  SQL = 'SQL',
}

// =============================================================================
// Zod Schemas for Enums
// =============================================================================

export const AchievementMetricTypeSchema = z.nativeEnum(AchievementMetricType);
export const AchievementTypeSchema = z.nativeEnum(AchievementType);
export const ThresholdOperatorSchema = z.nativeEnum(ThresholdOperator);
export const AchievementCompetitionTypeSchema = z.nativeEnum(AchievementCompetitionType);
export const AchievementFormatSchema = z.nativeEnum(AchievementFormat);

// =============================================================================
// Achievement Definition Schemas
// =============================================================================

export const CreateAchievementDefinitionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  group_name: z.string().max(100).optional().nullable(), // e.g., "dB Clubs"
  achievement_type: AchievementTypeSchema.default(AchievementType.DYNAMIC), // dynamic or static
  template_key: z.string().min(1).max(100),
  render_value: z.number().optional().nullable(), // value to display on image (e.g., 130 for "130+")
  format: AchievementFormatSchema.optional().nullable(),
  competition_type: AchievementCompetitionTypeSchema,
  metric_type: AchievementMetricTypeSchema,
  threshold_value: z.number().positive(),
  threshold_operator: ThresholdOperatorSchema.default(ThresholdOperator.GREATER_THAN_OR_EQUAL),
  class_filter: z.array(z.string()).optional().nullable(),
  division_filter: z.array(z.string()).optional().nullable(),
  points_multiplier: z.number().int().optional().nullable(),
  is_active: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export type CreateAchievementDefinitionDto = z.infer<typeof CreateAchievementDefinitionSchema>;

export const UpdateAchievementDefinitionSchema = CreateAchievementDefinitionSchema.partial();
export type UpdateAchievementDefinitionDto = z.infer<typeof UpdateAchievementDefinitionSchema>;

export const AchievementDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  group_name: z.string().nullable(),
  achievement_type: AchievementTypeSchema,
  template_key: z.string(),
  render_value: z.number().nullable(),
  format: AchievementFormatSchema.nullable(),
  competition_type: z.string(),
  metric_type: AchievementMetricTypeSchema,
  threshold_value: z.number(),
  threshold_operator: ThresholdOperatorSchema,
  class_filter: z.array(z.string()).nullable(),
  division_filter: z.array(z.string()).nullable(),
  points_multiplier: z.number().nullable(),
  is_active: z.boolean(),
  display_order: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type AchievementDefinition = z.infer<typeof AchievementDefinitionSchema>;

// =============================================================================
// Achievement Recipient Schemas
// =============================================================================

export const AchievementRecipientSchema = z.object({
  id: z.string().uuid(),
  achievement_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  profile_name: z.string().nullable(),
  meca_id: z.string().nullable(),
  achieved_value: z.number(),
  achieved_at: z.coerce.date(),
  competition_result_id: z.string().uuid().nullable(),
  event_id: z.string().uuid().nullable(),
  event_name: z.string().nullable(),
  season_id: z.string().uuid().nullable(),
  season_name: z.string().nullable(),
  image_url: z.string().nullable(),
  image_generated_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  // Joined data
  achievement: AchievementDefinitionSchema.optional(),
});

export type AchievementRecipient = z.infer<typeof AchievementRecipientSchema>;

// =============================================================================
// Achievement Template Schemas
// =============================================================================

export const AchievementTemplateSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  base_image_path: z.string(),
  font_size: z.number().int().default(500),
  text_x: z.number().int(),
  text_y: z.number().int(),
  text_color: z.string().default('#CC0F00'),
  is_active: z.boolean().default(true),
});

export type AchievementTemplate = z.infer<typeof AchievementTemplateSchema>;

export const CreateAchievementTemplateSchema = AchievementTemplateSchema.omit({ id: true });
export type CreateAchievementTemplateDto = z.infer<typeof CreateAchievementTemplateSchema>;

// =============================================================================
// Query/Filter Schemas
// =============================================================================

export const GetAchievementDefinitionsQuerySchema = z.object({
  format: AchievementFormatSchema.optional(),
  competition_type: AchievementCompetitionTypeSchema.optional(),
  is_active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type GetAchievementDefinitionsQuery = z.infer<typeof GetAchievementDefinitionsQuerySchema>;

export const GetAchievementRecipientsQuerySchema = z.object({
  achievement_id: z.string().uuid().optional(),
  profile_id: z.string().uuid().optional(),
  meca_id: z.string().optional(),
  season_id: z.string().uuid().optional(),
  group_name: z.string().optional(), // Filter by achievement group
  search: z.string().optional(), // Search by MECA ID or name
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(250).default(50),
});

export type GetAchievementRecipientsQuery = z.infer<typeof GetAchievementRecipientsQuerySchema>;

// =============================================================================
// API Response Schemas
// =============================================================================

export const AchievementDefinitionListResponseSchema = z.object({
  items: z.array(AchievementDefinitionSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type AchievementDefinitionListResponse = z.infer<typeof AchievementDefinitionListResponseSchema>;

export const AchievementRecipientListResponseSchema = z.object({
  items: z.array(AchievementRecipientSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type AchievementRecipientListResponse = z.infer<typeof AchievementRecipientListResponseSchema>;

// =============================================================================
// Member Achievements Response (for profile/dashboard display)
// =============================================================================

export const MemberAchievementSchema = z.object({
  id: z.string().uuid(),
  achievement_name: z.string(),
  achievement_description: z.string().nullable(),
  template_key: z.string(),
  format: AchievementFormatSchema.nullable(),
  competition_type: z.string(),
  achieved_value: z.number(),
  threshold_value: z.number(),
  achieved_at: z.coerce.date(),
  event_name: z.string().nullable(),
  image_url: z.string().nullable(),
  // Template info for CSS overlay rendering
  template_base_image_url: z.string().nullable(),
  template_font_size: z.number().nullable(),
  template_text_x: z.number().nullable(),
  template_text_y: z.number().nullable(),
  template_text_color: z.string().nullable(),
  // Render value (may differ from achieved_value for display, e.g., "130" instead of "130.5")
  render_value: z.number().nullable(),
});

export type MemberAchievement = z.infer<typeof MemberAchievementSchema>;

export const MemberAchievementsResponseSchema = z.object({
  achievements: z.array(MemberAchievementSchema),
  total_count: z.number(),
});

export type MemberAchievementsResponse = z.infer<typeof MemberAchievementsResponseSchema>;
