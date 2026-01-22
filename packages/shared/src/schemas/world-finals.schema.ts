import { z } from 'zod';

// =============================================================================
// World Finals Registration Schemas
// =============================================================================

export const CreateFinalsRegistrationSchema = z.object({
  season_id: z.string().uuid(),
  division: z.string().min(1).max(50),
  competition_class: z.string().min(1).max(100),
  team_name: z.string().max(255).optional().nullable(),
  vehicle_info: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateFinalsRegistrationDto = z.infer<typeof CreateFinalsRegistrationSchema>;

export const UpdateFinalsRegistrationSchema = CreateFinalsRegistrationSchema.partial().extend({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
});

export type UpdateFinalsRegistrationDto = z.infer<typeof UpdateFinalsRegistrationSchema>;

export const FinalsRegistrationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  meca_id: z.number().int().nullable(),
  season_id: z.string().uuid(),
  division: z.string(),
  competition_class: z.string(),
  team_name: z.string().nullable(),
  vehicle_info: z.string().nullable(),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type FinalsRegistration = z.infer<typeof FinalsRegistrationSchema>;

// =============================================================================
// World Finals Voting Schemas
// =============================================================================

export const CreateFinalsVoteSchema = z.object({
  category: z.string().min(1).max(100),
  vote_value: z.string().min(1).max(500),
  season_id: z.string().uuid().optional(),
});

export type CreateFinalsVoteDto = z.infer<typeof CreateFinalsVoteSchema>;

export const FinalsVoteSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  meca_id: z.number().int().nullable(),
  category: z.string(),
  vote_value: z.string(),
  season_id: z.string().uuid().nullable(),
  created_at: z.coerce.date(),
});

export type FinalsVote = z.infer<typeof FinalsVoteSchema>;

// =============================================================================
// Query Schemas
// =============================================================================

export const GetFinalsRegistrationsQuerySchema = z.object({
  season_id: z.string().uuid().optional(),
  division: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
});

export type GetFinalsRegistrationsQuery = z.infer<typeof GetFinalsRegistrationsQuerySchema>;

// =============================================================================
// Response Schemas
// =============================================================================

export const FinalsRegistrationStatsSchema = z.object({
  total_registrations: z.number(),
  by_division: z.record(z.number()),
  by_class: z.record(z.number()),
  by_status: z.record(z.number()),
});

export type FinalsRegistrationStats = z.infer<typeof FinalsRegistrationStatsSchema>;

export const VoteSummarySchema = z.object({
  category: z.string(),
  total_votes: z.number(),
  top_choices: z.array(z.object({
    vote_value: z.string(),
    count: z.number(),
  })),
});

export type VoteSummary = z.infer<typeof VoteSummarySchema>;
