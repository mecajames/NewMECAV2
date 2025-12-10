import { z } from "zod";

// Create Season DTO (API format with snake_case)
export const CreateSeasonApiSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  name: z.string().min(1),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  is_current: z.boolean().optional().default(false),
  is_next: z.boolean().optional().default(false),
});
export type CreateSeasonApiDto = z.infer<typeof CreateSeasonApiSchema>;

// Create Season DTO (internal camelCase format)
export const CreateSeasonSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional().default(false),
  isNext: z.boolean().optional().default(false),
});
export type CreateSeasonDto = z.infer<typeof CreateSeasonSchema>;

// Season Response Schema
export const SeasonSchema = z.object({
  id: z.string().uuid(),
  year: z.number(),
  name: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean(),
  isNext: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Season = z.infer<typeof SeasonSchema>;

// Update Season Schema
export const UpdateSeasonSchema = CreateSeasonSchema.partial();
export type UpdateSeasonDto = z.infer<typeof UpdateSeasonSchema>;

