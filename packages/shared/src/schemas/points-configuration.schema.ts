import { z } from 'zod';

/**
 * Points Configuration Schema
 *
 * Defines the structure for configurable competition points per season.
 * Points can be configured for:
 * - Standard events (1X, 2X, 3X multipliers) - base points multiplied
 * - 4X events (special scoring) - fixed points per placement
 * - Extended 4X placements (6th-50th) - optional participation points
 */

// ============================================================================
// Response Schema - Full configuration as stored in database
// ============================================================================

export const PointsConfigurationSchema = z.object({
  id: z.string().uuid(),

  // Season association
  season_id: z.string().uuid(),

  // Standard Event Base Points (multiplied by 1X, 2X, 3X)
  standard_1st_place: z.number().int().min(0).default(5),
  standard_2nd_place: z.number().int().min(0).default(4),
  standard_3rd_place: z.number().int().min(0).default(3),
  standard_4th_place: z.number().int().min(0).default(2),
  standard_5th_place: z.number().int().min(0).default(1),

  // 4X Event Points (SQ, Install, RTA, etc.) - Updated defaults per MECA requirements
  four_x_1st_place: z.number().int().min(0).default(30),
  four_x_2nd_place: z.number().int().min(0).default(27),
  four_x_3rd_place: z.number().int().min(0).default(24),
  four_x_4th_place: z.number().int().min(0).default(21),
  four_x_5th_place: z.number().int().min(0).default(18),

  // Extended 4X Placement Points (6th-50th place)
  four_x_extended_enabled: z.boolean().default(false),
  four_x_extended_points: z.number().int().min(0).default(15),
  four_x_extended_max_place: z.number().int().min(6).max(100).default(50),

  // Metadata
  is_active: z.boolean().default(true),
  description: z.string().nullable().optional(),
  updated_by: z.string().uuid().nullable().optional(),
  updated_at: z.coerce.date(),
  created_at: z.coerce.date(),
});

export type PointsConfiguration = z.infer<typeof PointsConfigurationSchema>;

// ============================================================================
// Create Schema - For creating new configuration
// ============================================================================

export const CreatePointsConfigurationSchema = z.object({
  // Season association (required)
  season_id: z.string().uuid(),

  // Standard Event Base Points (multiplied by 1X, 2X, 3X)
  standard_1st_place: z.number().int().min(0).default(5),
  standard_2nd_place: z.number().int().min(0).default(4),
  standard_3rd_place: z.number().int().min(0).default(3),
  standard_4th_place: z.number().int().min(0).default(2),
  standard_5th_place: z.number().int().min(0).default(1),

  // 4X Event Points
  four_x_1st_place: z.number().int().min(0).default(30),
  four_x_2nd_place: z.number().int().min(0).default(27),
  four_x_3rd_place: z.number().int().min(0).default(24),
  four_x_4th_place: z.number().int().min(0).default(21),
  four_x_5th_place: z.number().int().min(0).default(18),

  // Extended 4X Placement Points
  four_x_extended_enabled: z.boolean().default(false),
  four_x_extended_points: z.number().int().min(0).default(15),
  four_x_extended_max_place: z.number().int().min(6).max(100).default(50),

  // Metadata
  is_active: z.boolean().default(true),
  description: z.string().nullable().optional(),
});

export type CreatePointsConfigurationDto = z.infer<typeof CreatePointsConfigurationSchema>;

// ============================================================================
// Update Schema - For updating existing configuration
// ============================================================================

export const UpdatePointsConfigurationSchema = z.object({
  // Standard Event Base Points
  standard_1st_place: z.number().int().min(0).optional(),
  standard_2nd_place: z.number().int().min(0).optional(),
  standard_3rd_place: z.number().int().min(0).optional(),
  standard_4th_place: z.number().int().min(0).optional(),
  standard_5th_place: z.number().int().min(0).optional(),

  // 4X Event Points
  four_x_1st_place: z.number().int().min(0).optional(),
  four_x_2nd_place: z.number().int().min(0).optional(),
  four_x_3rd_place: z.number().int().min(0).optional(),
  four_x_4th_place: z.number().int().min(0).optional(),
  four_x_5th_place: z.number().int().min(0).optional(),

  // Extended 4X Placement Points
  four_x_extended_enabled: z.boolean().optional(),
  four_x_extended_points: z.number().int().min(0).optional(),
  four_x_extended_max_place: z.number().int().min(6).max(100).optional(),

  // Metadata
  is_active: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

export type UpdatePointsConfigurationDto = z.infer<typeof UpdatePointsConfigurationSchema>;

// ============================================================================
// Points Preview Schema - For showing calculated points in UI
// ============================================================================

export const PointsPreviewSchema = z.object({
  placement: z.number().int().min(1),
  standard_1x: z.number().int(),
  standard_2x: z.number().int(),
  standard_3x: z.number().int(),
  four_x: z.number().int(),
});

export type PointsPreview = z.infer<typeof PointsPreviewSchema>;

// ============================================================================
// Recalculation Result Schema
// ============================================================================

export const RecalculationResultSchema = z.object({
  events_processed: z.number().int(),
  results_updated: z.number().int(),
  duration_ms: z.number(),
});

export type RecalculationResult = z.infer<typeof RecalculationResultSchema>;
