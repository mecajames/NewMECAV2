import { z } from 'zod';
import {
  RatingEntityType,
  RatingEntityTypeSchema,
} from './enums.schema.js';

// =============================================================================
// Rating
// =============================================================================

export const CreateRatingSchema = z.object({
  event_id: z.string().uuid(),
  rated_entity_type: RatingEntityTypeSchema,
  rated_entity_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  is_anonymous: z.boolean().default(true),
});
export type CreateRatingDto = z.infer<typeof CreateRatingSchema>;

export const RatingSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  rated_entity_type: RatingEntityTypeSchema,
  rated_entity_id: z.string().uuid(),
  rated_by: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().nullable(),
  is_anonymous: z.boolean(),
  created_at: z.coerce.date(),
});
export type Rating = z.infer<typeof RatingSchema>;

// Extended schema with event info for display (hides rater identity if anonymous)
export const RatingWithEventSchema = RatingSchema.extend({
  event: z.object({
    id: z.string().uuid(),
    name: z.string(),
    event_date: z.coerce.date(),
  }),
  // Only include rater info if not anonymous
  rater: z.object({
    id: z.string().uuid(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
  }).nullable(),
});
export type RatingWithEvent = z.infer<typeof RatingWithEventSchema>;

// Summary stats for a judge or event director
export const RatingSummarySchema = z.object({
  entity_id: z.string().uuid(),
  entity_type: RatingEntityTypeSchema,
  average_rating: z.number(),
  total_ratings: z.number(),
  rating_distribution: z.object({
    '1': z.number(),
    '2': z.number(),
    '3': z.number(),
    '4': z.number(),
    '5': z.number(),
  }),
});
export type RatingSummary = z.infer<typeof RatingSummarySchema>;
