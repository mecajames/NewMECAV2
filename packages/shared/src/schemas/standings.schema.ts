import { z } from 'zod';

// =============================================================================
// Standings Leaderboard Entry Schemas
// (Using "Standings" prefix to avoid conflict with competition-results.schema.ts)
// =============================================================================

export const StandingsEntrySchema = z.object({
  meca_id: z.string().nullable(),
  competitor_name: z.string(),
  competitor_id: z.string().uuid().nullable(),
  total_points: z.number(),
  events_participated: z.number(),
  first_place: z.number(),
  second_place: z.number(),
  third_place: z.number(),
  is_guest: z.boolean(),
  rank: z.number().optional(),
});

export type StandingsEntry = z.infer<typeof StandingsEntrySchema>;

// =============================================================================
// Class Standings Schemas
// =============================================================================

export const ClassStandingsEntrySchema = StandingsEntrySchema.extend({
  competition_class: z.string(),
  format: z.string(),
});

export type ClassStandingsEntry = z.infer<typeof ClassStandingsEntrySchema>;

// =============================================================================
// Team Standings Schemas
// =============================================================================

export const TeamStandingsEntrySchema = z.object({
  team_id: z.string().uuid(),
  team_name: z.string(),
  total_points: z.number(),
  member_count: z.number(),
  events_participated: z.number(),
  rank: z.number().optional(),
});

export type TeamStandingsEntry = z.infer<typeof TeamStandingsEntrySchema>;

// =============================================================================
// Format Summary Schemas
// =============================================================================

export const FormatStandingsSummarySchema = z.object({
  format: z.string(),
  total_competitors: z.number(),
  total_events: z.number(),
  top_competitors: z.array(StandingsEntrySchema),
});

export type FormatStandingsSummary = z.infer<typeof FormatStandingsSummarySchema>;

// =============================================================================
// Competitor Stats Schemas
// =============================================================================

export const CompetitorStatsSchema = z.object({
  meca_id: z.string(),
  total_points: z.number(),
  ranking: z.number(),
  events_participated: z.number(),
  placements: z.object({
    first: z.number(),
    second: z.number(),
    third: z.number(),
  }),
  by_format: z.array(z.object({
    format: z.string(),
    points: z.number(),
    events: z.number(),
  })),
  by_class: z.array(z.object({
    format: z.string(),
    class_name: z.string(),
    points: z.number(),
    events: z.number(),
  })),
});

export type CompetitorStats = z.infer<typeof CompetitorStatsSchema>;

// =============================================================================
// Query Schemas
// =============================================================================

export const GetStandingsQuerySchema = z.object({
  season_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type GetStandingsQuery = z.infer<typeof GetStandingsQuerySchema>;

export const GetStandingsByFormatQuerySchema = z.object({
  season_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type GetStandingsByFormatQuery = z.infer<typeof GetStandingsByFormatQuerySchema>;

// =============================================================================
// Response Schemas
// =============================================================================

export const StandingsResponseSchema = z.object({
  entries: z.array(StandingsEntrySchema),
  total: z.number(),
});

export type StandingsResponse = z.infer<typeof StandingsResponseSchema>;

export const ClassInfoSchema = z.object({
  format: z.string(),
  class_name: z.string(),
  result_count: z.number(),
});

export type ClassInfo = z.infer<typeof ClassInfoSchema>;

export const ClassListResponseSchema = z.object({
  classes: z.array(ClassInfoSchema),
});

export type ClassListResponse = z.infer<typeof ClassListResponseSchema>;
