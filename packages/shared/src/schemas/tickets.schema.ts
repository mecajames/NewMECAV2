import { z } from 'zod';
import {
  TicketStatus,
  TicketStatusSchema,
  TicketPriority,
  TicketPrioritySchema,
  TicketCategory,
  TicketCategorySchema,
  TicketDepartment,
  TicketDepartmentSchema,
} from './enums.schema';

// =============================================================================
// Ticket Schemas
// =============================================================================

// Create Ticket DTO
export const CreateTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  category: TicketCategorySchema.default(TicketCategory.GENERAL),
  department: TicketDepartmentSchema.default(TicketDepartment.GENERAL_SUPPORT),
  priority: TicketPrioritySchema.default(TicketPriority.MEDIUM),
  reporter_id: z.string().uuid(),
  event_id: z.string().uuid().optional().nullable(),
});
export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;

// Update Ticket DTO
export const UpdateTicketSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  category: TicketCategorySchema.optional(),
  department: TicketDepartmentSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  status: TicketStatusSchema.optional(),
  assigned_to_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
  resolved_at: z.coerce.date().optional().nullable(),
});
export type UpdateTicketDto = z.infer<typeof UpdateTicketSchema>;

// Ticket Response Schema (full entity)
export const TicketSchema = z.object({
  id: z.string().uuid(),
  ticket_number: z.string(),
  title: z.string(),
  description: z.string(),
  category: TicketCategorySchema,
  department: TicketDepartmentSchema,
  priority: TicketPrioritySchema,
  status: TicketStatusSchema,
  reporter_id: z.string().uuid(),
  assigned_to_id: z.string().uuid().nullable(),
  event_id: z.string().uuid().nullable(),
  resolved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Ticket = z.infer<typeof TicketSchema>;

// Ticket with relations (for detailed views)
export const TicketWithRelationsSchema = TicketSchema.extend({
  reporter: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
  }).optional(),
  assigned_to: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
  }).optional().nullable(),
  event: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).optional().nullable(),
  comments_count: z.number().optional(),
});
export type TicketWithRelations = z.infer<typeof TicketWithRelationsSchema>;

// =============================================================================
// Ticket Comment Schemas
// =============================================================================

// Create Comment DTO
export const CreateTicketCommentSchema = z.object({
  ticket_id: z.string().uuid(),
  author_id: z.string().uuid(),
  content: z.string().min(1, 'Comment content is required'),
  is_internal: z.boolean().default(false),
});
export type CreateTicketCommentDto = z.infer<typeof CreateTicketCommentSchema>;

// Update Comment DTO
export const UpdateTicketCommentSchema = z.object({
  content: z.string().min(1).optional(),
  is_internal: z.boolean().optional(),
});
export type UpdateTicketCommentDto = z.infer<typeof UpdateTicketCommentSchema>;

// Comment Response Schema
export const TicketCommentSchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  author_id: z.string().uuid(),
  content: z.string(),
  is_internal: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type TicketComment = z.infer<typeof TicketCommentSchema>;

// Comment with author details
export const TicketCommentWithAuthorSchema = TicketCommentSchema.extend({
  author: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    role: z.string(),
  }).optional(),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    file_name: z.string(),
    file_size: z.number(),
    mime_type: z.string(),
  })).optional(),
});
export type TicketCommentWithAuthor = z.infer<typeof TicketCommentWithAuthorSchema>;

// =============================================================================
// Ticket Attachment Schemas
// =============================================================================

// Create Attachment DTO
export const CreateTicketAttachmentSchema = z.object({
  ticket_id: z.string().uuid(),
  comment_id: z.string().uuid().optional().nullable(),
  uploader_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_path: z.string().min(1),
  file_size: z.number().positive(),
  mime_type: z.string().min(1),
});
export type CreateTicketAttachmentDto = z.infer<typeof CreateTicketAttachmentSchema>;

// Attachment Response Schema
export const TicketAttachmentSchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid(),
  comment_id: z.string().uuid().nullable(),
  uploader_id: z.string().uuid(),
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  created_at: z.coerce.date(),
});
export type TicketAttachment = z.infer<typeof TicketAttachmentSchema>;

// =============================================================================
// Ticket Statistics Schema
// =============================================================================

export const TicketStatsSchema = z.object({
  total: z.number(),
  open: z.number(),
  in_progress: z.number(),
  awaiting_response: z.number(),
  resolved: z.number(),
  closed: z.number(),
  by_priority: z.object({
    low: z.number(),
    medium: z.number(),
    high: z.number(),
    critical: z.number(),
  }),
  by_category: z.record(z.string(), z.number()),
  by_department: z.record(z.string(), z.number()),
  average_resolution_time_hours: z.number().nullable(),
});
export type TicketStats = z.infer<typeof TicketStatsSchema>;

// =============================================================================
// Ticket List Query Schema
// =============================================================================

export const TicketListQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(10),
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  category: TicketCategorySchema.optional(),
  department: TicketDepartmentSchema.optional(),
  reporter_id: z.string().uuid().optional(),
  assigned_to_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'priority', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type TicketListQuery = z.infer<typeof TicketListQuerySchema>;

// Paginated response
export const PaginatedTicketsSchema = z.object({
  data: z.array(TicketWithRelationsSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  total_pages: z.number(),
});
export type PaginatedTickets = z.infer<typeof PaginatedTicketsSchema>;
