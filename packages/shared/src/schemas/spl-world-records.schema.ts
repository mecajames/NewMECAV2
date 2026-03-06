import { z } from 'zod';

// Create SPL World Record DTO (API format with snake_case)
export const CreateSplWorldRecordApiSchema = z.object({
  class_id: z.string().uuid(),
  class_name: z.string().min(1),
  event_id: z.string().uuid().optional().nullable(),
  event_name: z.string().optional().nullable(),
  season_id: z.string().uuid().optional().nullable(),
  competitor_name: z.string().min(1),
  meca_id: z.string().optional().nullable(),
  competitor_id: z.string().uuid().optional().nullable(),
  score: z.number(),
  wattage: z.number().int().optional().nullable(),
  frequency: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  record_date: z.string().optional().nullable(),
  created_by: z.string().uuid().optional(),
});
export type CreateSplWorldRecordApiDto = z.infer<typeof CreateSplWorldRecordApiSchema>;

// Create SPL World Record DTO (internal camelCase format)
export const CreateSplWorldRecordSchema = z.object({
  classId: z.string().uuid(),
  className: z.string().min(1),
  eventId: z.string().uuid().optional().nullable(),
  eventName: z.string().optional().nullable(),
  seasonId: z.string().uuid().optional().nullable(),
  competitorName: z.string().min(1),
  mecaId: z.string().optional().nullable(),
  competitorId: z.string().uuid().optional().nullable(),
  score: z.number(),
  wattage: z.number().int().optional().nullable(),
  frequency: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  recordDate: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional(),
});
export type CreateSplWorldRecordDto = z.infer<typeof CreateSplWorldRecordSchema>;

// SPL World Record Response Schema
export const SplWorldRecordSchema = z.object({
  id: z.string().uuid(),
  class_id: z.string().uuid(),
  class_name: z.string(),
  event_id: z.string().uuid().nullable(),
  event_name: z.string().nullable(),
  season_id: z.string().uuid().nullable(),
  competitor_name: z.string(),
  meca_id: z.string().nullable(),
  competitor_id: z.string().uuid().nullable(),
  score: z.number(),
  wattage: z.number().nullable(),
  frequency: z.number().nullable(),
  notes: z.string().nullable(),
  record_date: z.string().nullable(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});
export type SplWorldRecord = z.infer<typeof SplWorldRecordSchema>;

// Update Schema (partial of create)
export const UpdateSplWorldRecordApiSchema = CreateSplWorldRecordApiSchema.partial();
export type UpdateSplWorldRecordApiDto = z.infer<typeof UpdateSplWorldRecordApiSchema>;

// SPL World Record History Response Schema
export const SplWorldRecordHistorySchema = z.object({
  id: z.string().uuid(),
  record_id: z.string().uuid(),
  class_id: z.string().uuid(),
  class_name: z.string(),
  event_id: z.string().uuid().nullable(),
  event_name: z.string().nullable(),
  season_id: z.string().uuid().nullable(),
  competitor_name: z.string(),
  meca_id: z.string().nullable(),
  competitor_id: z.string().uuid().nullable(),
  score: z.number(),
  wattage: z.number().nullable(),
  frequency: z.number().nullable(),
  notes: z.string().nullable(),
  record_date: z.string().nullable(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid().nullable(),
  replaced_at: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});
export type SplWorldRecordHistory = z.infer<typeof SplWorldRecordHistorySchema>;
