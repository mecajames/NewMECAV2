import { z } from 'zod';
import { TicketCategorySchema, TicketCustomFieldTypeSchema } from './enums.schema.js';

// =============================================================================
// Ticket Custom Field Schemas
//
// Admin-defined fields shown on the support form based on the chosen category.
// One form, category-first: picking a category reveals that category's fields.
// =============================================================================

export const TicketCustomFieldOptionSchema = z.object({
  value: z.string().min(1).max(120),
  label: z.string().min(1).max(120),
});
export type TicketCustomFieldOption = z.infer<typeof TicketCustomFieldOptionSchema>;

// Conditional visibility: show this field only when another field's value
// satisfies the condition. `field_id` is the controlling field. Required is
// only enforced when a field is actually visible.
export const TicketFieldConditionOperatorSchema = z.enum([
  'equals', // controlling value === values[0]
  'one_of', // values includes the controlling value (any overlap for multi-select)
  'is_checked', // controlling checkbox is true
  'not_empty', // controlling field has any value
]);
export type TicketFieldConditionOperator = z.infer<typeof TicketFieldConditionOperatorSchema>;

export const TicketFieldShowWhenSchema = z.object({
  field_id: z.string().uuid(),
  operator: TicketFieldConditionOperatorSchema,
  values: z.array(z.string()).default([]),
});
export type TicketFieldShowWhen = z.infer<typeof TicketFieldShowWhenSchema>;

export const CreateTicketCustomFieldSchema = z.object({
  // Stable machine key (immutable once created). lowercase/underscore.
  field_key: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers and underscores (must start with a letter)'),
  label: z.string().min(1).max(120),
  field_type: TicketCustomFieldTypeSchema,
  help_text: z.string().max(500).optional().nullable(),
  // Only meaningful for select / multiselect.
  options: z.array(TicketCustomFieldOptionSchema).optional().nullable(),
  // Which categories this field appears under (at least one).
  categories: z.array(TicketCategorySchema).min(1, 'Assign the field to at least one category'),
  required: z.boolean().default(false),
  // false = admin-only (never shown on the public/member submission form).
  visible_to_user: z.boolean().default(true),
  // Optional field-to-field condition (show only when another field matches).
  show_when: TicketFieldShowWhenSchema.optional().nullable(),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});
export type CreateTicketCustomFieldDto = z.infer<typeof CreateTicketCustomFieldSchema>;

export const UpdateTicketCustomFieldSchema = CreateTicketCustomFieldSchema.partial();
export type UpdateTicketCustomFieldDto = z.infer<typeof UpdateTicketCustomFieldSchema>;

// Field definition as returned by the API.
export const TicketCustomFieldSchema = z.object({
  id: z.string().uuid(),
  field_key: z.string(),
  label: z.string(),
  field_type: TicketCustomFieldTypeSchema,
  help_text: z.string().nullable(),
  options: z.array(TicketCustomFieldOptionSchema).nullable(),
  categories: z.array(z.string()),
  required: z.boolean(),
  visible_to_user: z.boolean(),
  show_when: TicketFieldShowWhenSchema.nullable(),
  display_order: z.number(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TicketCustomField = z.infer<typeof TicketCustomFieldSchema>;

// A member's purchase, as listed in a purchase_reference field. The chosen
// item's snapshot is stored (JSON) on the answer so the admin ticket view has
// full context without a follow-up lookup.
export const TicketPurchaseSchema = z.object({
  type: z.enum(['membership', 'shop', 'event_registration', 'world_finals']),
  id: z.string().uuid(),
  label: z.string(),
  amount: z.number(),
  purchased_at: z.string(),
  method: z.enum(['stripe', 'paypal', 'unknown']),
  transaction_id: z.string().nullable(),
  days_since_purchase: z.number(),
  refund_eligible: z.boolean(),
});
export type TicketPurchase = z.infer<typeof TicketPurchaseSchema>;

// Answer value: a string, number, boolean, a list (multiselect), or null.
export const TicketCustomFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);
export type TicketCustomFieldValue = z.infer<typeof TicketCustomFieldValueSchema>;

// Answer submitted alongside a new ticket.
export const TicketCustomFieldAnswerInputSchema = z.object({
  field_id: z.string().uuid(),
  value: TicketCustomFieldValueSchema,
});
export type TicketCustomFieldAnswerInput = z.infer<typeof TicketCustomFieldAnswerInputSchema>;

// Answer returned in a ticket detail response (decoded + with field metadata).
export const TicketCustomFieldAnswerSchema = z.object({
  field_id: z.string().uuid(),
  field_key: z.string(),
  label: z.string(),
  field_type: TicketCustomFieldTypeSchema,
  value: TicketCustomFieldValueSchema,
});
export type TicketCustomFieldAnswer = z.infer<typeof TicketCustomFieldAnswerSchema>;
