import { z } from 'zod';

export const HallOfFameCategorySchema = z.enum(['competitors', 'teams', 'retailers', 'judges']);
export type HallOfFameCategory = z.infer<typeof HallOfFameCategorySchema>;

export const CreateHallOfFameInducteeSchema = z.object({
  category: HallOfFameCategorySchema,
  induction_year: z.number().int().min(1900).max(2100),
  name: z.string().min(1),
  state: z.string().optional().nullable(),
  team_affiliation: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
});
export type CreateHallOfFameInducteeDto = z.infer<typeof CreateHallOfFameInducteeSchema>;

export const UpdateHallOfFameInducteeSchema = CreateHallOfFameInducteeSchema.partial();
export type UpdateHallOfFameInducteeDto = z.infer<typeof UpdateHallOfFameInducteeSchema>;

export const HallOfFameInducteeSchema = z.object({
  id: z.string().uuid(),
  category: HallOfFameCategorySchema,
  induction_year: z.number(),
  name: z.string(),
  state: z.string().nullable(),
  team_affiliation: z.string().nullable(),
  location: z.string().nullable(),
  bio: z.string().nullable(),
  image_url: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  updated_by: z.string().uuid().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type HallOfFameInductee = z.infer<typeof HallOfFameInducteeSchema>;
