import { z } from 'zod';
import { TrainingTypeSchema, TraineeTypeSchema, TrainingResultSchema } from './enums.schema.js';

// =============================================================================
// Training Record DTOs
// =============================================================================

export const CreateTrainingRecordSchema = z.object({
  trainee_type: TraineeTypeSchema,
  trainee_id: z.string().uuid(),
  training_type: TrainingTypeSchema,
  training_date: z.string().or(z.date()),
  result: TrainingResultSchema,
  trainer_id: z.string().uuid(),
  notes: z.string().optional(),
});
export type CreateTrainingRecordDto = z.infer<typeof CreateTrainingRecordSchema>;

export const UpdateTrainingRecordSchema = CreateTrainingRecordSchema.partial();
export type UpdateTrainingRecordDto = z.infer<typeof UpdateTrainingRecordSchema>;

export const TrainingRecordSchema = z.object({
  id: z.string().uuid(),
  trainee_type: TraineeTypeSchema,
  trainee_id: z.string().uuid(),
  training_type: TrainingTypeSchema,
  training_date: z.coerce.date(),
  result: TrainingResultSchema,
  trainer_id: z.string().uuid(),
  notes: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  // Populated relations
  trainer: z.object({
    id: z.string().uuid(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
  }).optional(),
});
export type TrainingRecord = z.infer<typeof TrainingRecordSchema>;
