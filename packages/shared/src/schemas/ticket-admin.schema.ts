import { z } from 'zod';
import { TicketPrioritySchema } from './enums.schema.js';

// =============================================================================
// Permission Level Enum
// =============================================================================

export enum TicketStaffPermission {
  STAFF = 1,
  SUPERVISOR = 2,
  ADMIN = 3,
}

export const TicketStaffPermissionSchema = z.nativeEnum(TicketStaffPermission);

// =============================================================================
// Ticket Department Schemas
// =============================================================================

export const CreateTicketDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(50).regex(/^[a-z0-9_]+$/, 'Slug must be lowercase with underscores'),
  description: z.string().optional().nullable(),
  is_private: z.boolean().default(false),
  is_default: z.boolean().default(false),
  display_order: z.number().int().default(0),
});
export type CreateTicketDepartmentDto = z.infer<typeof CreateTicketDepartmentSchema>;

export const UpdateTicketDepartmentSchema = CreateTicketDepartmentSchema.partial().extend({
  is_active: z.boolean().optional(),
});
export type UpdateTicketDepartmentDto = z.infer<typeof UpdateTicketDepartmentSchema>;

export const TicketDepartmentResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  is_private: z.boolean(),
  is_default: z.boolean(),
  display_order: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TicketDepartmentType = z.infer<typeof TicketDepartmentResponseSchema>;

// =============================================================================
// Ticket Staff Schemas
// =============================================================================

export const CreateTicketStaffSchema = z.object({
  profile_id: z.string().uuid(),
  permission_level: z.number().int().min(1).max(3).default(1),
  can_be_assigned_tickets: z.boolean().default(true),
  receive_email_notifications: z.boolean().default(true),
  department_ids: z.array(z.string().uuid()).optional(), // For initial department assignment
});
export type CreateTicketStaffDto = z.infer<typeof CreateTicketStaffSchema>;

export const UpdateTicketStaffSchema = z.object({
  permission_level: z.number().int().min(1).max(3).optional(),
  is_active: z.boolean().optional(),
  can_be_assigned_tickets: z.boolean().optional(),
  receive_email_notifications: z.boolean().optional(),
});
export type UpdateTicketStaffDto = z.infer<typeof UpdateTicketStaffSchema>;

export const TicketStaffSchema = z.object({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  permission_level: z.number(),
  is_active: z.boolean(),
  can_be_assigned_tickets: z.boolean(),
  receive_email_notifications: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  profile: z.object({
    id: z.string().uuid(),
    email: z.string().nullable(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    role: z.string().nullable(),
  }).optional(),
  departments: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    is_department_head: z.boolean(),
  })).optional(),
});
export type TicketStaffType = z.infer<typeof TicketStaffSchema>;

// =============================================================================
// Staff-Department Assignment Schemas
// =============================================================================

export const AssignStaffToDepartmentsSchema = z.object({
  department_ids: z.array(z.string().uuid()).min(1, 'At least one department is required'),
});
export type AssignStaffToDepartmentsDto = z.infer<typeof AssignStaffToDepartmentsSchema>;

export const SetDepartmentHeadSchema = z.object({
  is_department_head: z.boolean(),
});
export type SetDepartmentHeadDto = z.infer<typeof SetDepartmentHeadSchema>;

// =============================================================================
// Routing Rule Schemas
// =============================================================================

export const RoutingConditionsSchema = z.object({
  category: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  user_membership_status: z.string().optional(),
  title_contains: z.string().optional(),
  description_contains: z.string().optional(),
});
export type RoutingConditions = z.infer<typeof RoutingConditionsSchema>;

export const CreateTicketRoutingRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  priority: z.number().int().default(0),
  conditions: RoutingConditionsSchema.default({}),
  assign_to_department_id: z.string().uuid().optional().nullable(),
  assign_to_staff_id: z.string().uuid().optional().nullable(),
  set_priority: z.enum(['low', 'medium', 'high', 'critical']).optional().nullable(),
});
export type CreateTicketRoutingRuleDto = z.infer<typeof CreateTicketRoutingRuleSchema>;

export const UpdateTicketRoutingRuleSchema = CreateTicketRoutingRuleSchema.partial();
export type UpdateTicketRoutingRuleDto = z.infer<typeof UpdateTicketRoutingRuleSchema>;

export const TicketRoutingRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  priority: z.number(),
  conditions: RoutingConditionsSchema,
  assign_to_department_id: z.string().uuid().nullable(),
  assign_to_staff_id: z.string().uuid().nullable(),
  set_priority: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  assign_to_department: TicketDepartmentResponseSchema.optional().nullable(),
  assign_to_staff: TicketStaffSchema.optional().nullable(),
});
export type TicketRoutingRuleType = z.infer<typeof TicketRoutingRuleSchema>;

// =============================================================================
// Ticket Settings Schemas
// =============================================================================

export const UpdateTicketSettingSchema = z.object({
  value: z.string(),
});
export type UpdateTicketSettingDto = z.infer<typeof UpdateTicketSettingSchema>;

export const TicketSettingSchema = z.object({
  id: z.string().uuid(),
  setting_key: z.string(),
  setting_value: z.string(),
  setting_type: z.string(),
  description: z.string().nullable(),
  updated_at: z.coerce.date(),
});
export type TicketSettingType = z.infer<typeof TicketSettingSchema>;

// All settings as a typed object
export const TicketSettingsMapSchema = z.object({
  allow_user_department_selection: z.boolean(),
  allow_attachments: z.boolean(),
  max_attachment_size_mb: z.number(),
  require_category: z.boolean(),
  auto_close_resolved_days: z.number(),
  enable_email_notifications: z.boolean(),
  default_department_id: z.string().uuid().optional(),
});
export type TicketSettingsMap = z.infer<typeof TicketSettingsMapSchema>;

// =============================================================================
// Response Type Aliases (for API client compatibility)
// =============================================================================

export type TicketDepartmentResponse = TicketDepartmentType;
export type TicketStaffResponse = TicketStaffType;
export type TicketRoutingRuleResponse = TicketRoutingRuleType;
export type TicketSettingResponse = TicketSettingType;
