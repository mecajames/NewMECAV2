import { z } from 'zod';

// =============================================================================
// State Schemas
// =============================================================================

export const StateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  abbreviation: z.string().max(10),
  country: z.string().max(100).nullable(),
  is_domestic: z.boolean(),
});

export type State = z.infer<typeof StateSchema>;

// =============================================================================
// State Finals Date Schemas
// =============================================================================

export const CreateStateFinalsDateSchema = z.object({
  state_code: z.string().min(1).max(10),
  season_id: z.string().uuid(),
  finals_date: z.coerce.date().optional().nullable(),
  venue_name: z.string().max(255).optional().nullable(),
  venue_address: z.string().max(500).optional().nullable(),
  venue_city: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  is_confirmed: z.boolean().optional().default(false),
});

export type CreateStateFinalsDateDto = z.infer<typeof CreateStateFinalsDateSchema>;

export const UpdateStateFinalsDateSchema = CreateStateFinalsDateSchema.partial();
export type UpdateStateFinalsDateDto = z.infer<typeof UpdateStateFinalsDateSchema>;

export const StateFinalsDateSchema = z.object({
  id: z.string().uuid(),
  state_code: z.string(),
  season_id: z.string().uuid(),
  finals_date: z.coerce.date().nullable(),
  venue_name: z.string().nullable(),
  venue_address: z.string().nullable(),
  venue_city: z.string().nullable(),
  notes: z.string().nullable(),
  is_confirmed: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  // Joined data
  state: StateSchema.optional(),
});

export type StateFinalsDate = z.infer<typeof StateFinalsDateSchema>;

// =============================================================================
// Query Schemas
// =============================================================================

export const GetStatesQuerySchema = z.object({
  is_domestic: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type GetStatesQuery = z.infer<typeof GetStatesQuerySchema>;

// =============================================================================
// Response Schemas
// =============================================================================

export const StateListResponseSchema = z.object({
  states: z.array(StateSchema),
  total: z.number(),
});

export type StateListResponse = z.infer<typeof StateListResponseSchema>;

export const StateFinalsDateListResponseSchema = z.object({
  finals_dates: z.array(StateFinalsDateSchema),
  total: z.number(),
});

export type StateFinalsDateListResponse = z.infer<typeof StateFinalsDateListResponseSchema>;
