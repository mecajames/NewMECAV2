import { z } from 'zod';

// Create Competition Result DTO (API format with snake_case)
export const CreateCompetitionResultApiSchema = z.object({
  event_id: z.string().uuid(),
  season_id: z.string().uuid().optional(),
  competitor_id: z.string().uuid().optional().nullable(),
  competitor_name: z.string().min(1),
  meca_id: z.string().optional().nullable(),
  competition_class: z.string().min(1),
  class_id: z.string().uuid().optional(),
  format: z.string().optional(),
  score: z.number(),
  placement: z.number().int().min(0).optional(),
  points_earned: z.number().min(0).optional(),
  vehicle_info: z.string().optional(),
  wattage: z.number().optional(),
  frequency: z.number().optional(),
  notes: z.string().optional(),
  created_by: z.string().uuid().optional(),
});
export type CreateCompetitionResultApiDto = z.infer<typeof CreateCompetitionResultApiSchema>;

// Create Competition Result DTO (internal camelCase format)
export const CreateCompetitionResultSchema = z.object({
  eventId: z.string().uuid(),
  seasonId: z.string().uuid().optional(),
  competitorId: z.string().uuid().optional().nullable(),
  competitorName: z.string().min(1),
  mecaId: z.string().optional().nullable(),
  competitionClass: z.string().min(1),
  classId: z.string().uuid().optional(),
  format: z.string().optional(),
  score: z.number(),
  placement: z.number().int().min(0).optional(),
  pointsEarned: z.number().min(0).optional(),
  vehicleInfo: z.string().optional(),
  wattage: z.number().optional(),
  frequency: z.number().optional(),
  notes: z.string().optional(),
  createdBy: z.string().uuid().optional(),
});
export type CreateCompetitionResultDto = z.infer<typeof CreateCompetitionResultSchema>;

// Competition Result Response Schema
export const CompetitionResultSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  seasonId: z.string().uuid().nullable(),
  competitorId: z.string().uuid().nullable(),
  competitorName: z.string(),
  mecaId: z.string().nullable(),
  stateCode: z.string().nullable().optional(),
  competitionClass: z.string(),
  classId: z.string().uuid().nullable(),
  format: z.string().nullable(),
  score: z.number(),
  placement: z.number(),
  pointsEarned: z.number(),
  vehicleInfo: z.string().nullable(),
  wattage: z.number().nullable(),
  frequency: z.number().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  modificationReason: z.string().nullable(),
  revisionCount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CompetitionResult = z.infer<typeof CompetitionResultSchema>;

// Update Competition Result Schema
export const UpdateCompetitionResultSchema = CreateCompetitionResultSchema.partial().extend({
  updated_by: z.string().uuid().optional(),
  modification_reason: z.string().optional(),
});
export type UpdateCompetitionResultDto = z.infer<typeof UpdateCompetitionResultSchema>;

// Leaderboard Entry Schema
export const LeaderboardEntrySchema = z.object({
  competitor_id: z.string(),
  competitor_name: z.string(),
  total_points: z.number(),
  events_participated: z.number(),
  first_place: z.number(),
  second_place: z.number(),
  third_place: z.number(),
  meca_id: z.string().nullable(),
  membership_expiry: z.coerce.date().nullable(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

// Import Results Request
export const ImportResultsSchema = z.object({
  eventId: z.string().uuid(),
  results: z.array(
    z.object({
      memberID: z.string().optional(),
      name: z.string(),
      class: z.string(),
      format: z.string().optional(),
      score: z.number(),
      placement: z.number().optional(),
      points: z.number().optional(),
      vehicleInfo: z.string().optional(),
      wattage: z.number().optional(),
      frequency: z.number().optional(),
    })
  ),
  createdBy: z.string().uuid(),
});
export type ImportResultsDto = z.infer<typeof ImportResultsSchema>;

// Import Results Response
export const ImportResultsResponseSchema = z.object({
  message: z.string(),
  imported: z.number(),
  errors: z.array(z.string()),
});
export type ImportResultsResponse = z.infer<typeof ImportResultsResponseSchema>;

// Import with Resolution Request
export const ImportWithResolutionSchema = z.object({
  eventId: z.string().uuid(),
  results: z.array(z.record(z.string(), z.unknown())),
  createdBy: z.string().uuid(),
  resolutions: z.record(z.string(), z.enum(['skip', 'replace'])),
});
export type ImportWithResolutionDto = z.infer<typeof ImportWithResolutionSchema>;

// Import with Resolution Response
export const ImportWithResolutionResponseSchema = z.object({
  message: z.string(),
  imported: z.number(),
  updated: z.number(),
  skipped: z.number(),
  errors: z.array(z.string()),
});
export type ImportWithResolutionResponse = z.infer<typeof ImportWithResolutionResponseSchema>;

// Duplicate Check Response
export const DuplicateCheckResponseSchema = z.object({
  duplicates: z.array(
    z.object({
      index: z.number(),
      importData: z.record(z.string(), z.unknown()),
      existingData: z.record(z.string(), z.unknown()),
      matchType: z.enum(['meca_id', 'name']),
    })
  ),
  nonDuplicates: z.array(z.number()),
});
export type DuplicateCheckResponse = z.infer<typeof DuplicateCheckResponseSchema>;
