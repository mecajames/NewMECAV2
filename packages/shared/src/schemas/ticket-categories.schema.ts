import { z } from 'zod';
import { TicketAudienceSchema } from './ticket-admin.schema.js';

// =============================================================================
// Managed, department-scoped ticket categories.
//
// Replaces the fixed TicketCategory enum as the source of truth for the
// support form: the user picks a Department, then a Category that belongs to
// it. The TicketCategory enum is kept for back-compat of existing keys; new
// categories can use any key. The chosen category's `key` is stored in
// tickets.category (free text) and is what routing rules match on.
// (Named *Config to avoid clashing with the TicketCategory enum.)
// =============================================================================

export const CreateTicketCategorySchema = z.object({
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers and underscores (must start with a letter)'),
  label: z.string().min(1).max(120),
  department_id: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  audience: TicketAudienceSchema.default('all'),
  required_roles: z.array(z.string()).optional().nullable(),
  // Per-category auto-assign override. Null = fall back to the department's
  // default assignee.
  default_assignee_id: z.string().uuid().optional().nullable(),
});
export type CreateTicketCategoryDto = z.infer<typeof CreateTicketCategorySchema>;

export const UpdateTicketCategorySchema = CreateTicketCategorySchema.partial();
export type UpdateTicketCategoryDto = z.infer<typeof UpdateTicketCategorySchema>;

export const TicketCategoryConfigSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  label: z.string(),
  department_id: z.string().uuid().nullable(),
  description: z.string().nullable(),
  display_order: z.number(),
  is_active: z.boolean(),
  audience: TicketAudienceSchema.default('all'),
  required_roles: z.array(z.string()).nullable().optional(),
  default_assignee_id: z.string().uuid().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TicketCategoryConfig = z.infer<typeof TicketCategoryConfigSchema>;
