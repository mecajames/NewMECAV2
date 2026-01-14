import { z } from 'zod';
import {
  ApplicationStatus,
  ApplicationStatusSchema,
  WeekendAvailability,
  WeekendAvailabilitySchema,
  ApplicationEntryMethod,
  ApplicationEntryMethodSchema,
  SeasonQualificationStatus,
  SeasonQualificationStatusSchema,
  EventAssignmentStatus,
  EventAssignmentStatusSchema,
  AssignmentRequestType,
  AssignmentRequestTypeSchema,
} from './enums.schema.js';

// =============================================================================
// Event Director Application Reference
// =============================================================================

export const CreateEventDirectorApplicationReferenceSchema = z.object({
  name: z.string().min(1, 'Reference name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  company_name: z.string().optional(),
});
export type CreateEventDirectorApplicationReferenceDto = z.infer<typeof CreateEventDirectorApplicationReferenceSchema>;

export const EventDirectorApplicationReferenceSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  name: z.string(),
  relationship: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  company_name: z.string().nullable(),
  email_verified: z.boolean(),
  verified_at: z.coerce.date().nullable(),
  verification_response: z.string().nullable(),
  created_at: z.coerce.date(),
});
export type EventDirectorApplicationReference = z.infer<typeof EventDirectorApplicationReferenceSchema>;

// =============================================================================
// Event Director Application
// =============================================================================

export const CreateEventDirectorApplicationSchema = z.object({
  // Personal Information
  full_name: z.string().min(1, 'Full name is required'),
  preferred_name: z.string().optional(),
  date_of_birth: z.coerce.date(),
  phone: z.string().min(10, 'Phone number is required'),
  secondary_phone: z.string().optional(),
  headshot_url: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().url().optional()
  ),

  // Location Information
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  zip: z.string().min(1, 'ZIP code is required'),
  travel_radius: z.string().min(1, 'Travel radius is required'),
  additional_regions: z.array(z.string()).default([]),

  // Availability
  weekend_availability: WeekendAvailabilitySchema,
  availability_notes: z.string().optional(),

  // Experience
  years_in_industry: z.number().min(0),
  event_management_experience: z.string().min(1, 'Event management experience is required'),
  team_management_experience: z.string().min(1, 'Team management experience is required'),
  equipment_resources: z.string().optional(),
  specialized_formats: z.array(z.string()).default([]),

  // Essays
  essay_why_ed: z.string().min(100, 'Essay must be at least 100 characters'),
  essay_qualifications: z.string().min(100, 'Essay must be at least 100 characters'),
  essay_additional: z.string().optional(),

  // Acknowledgments
  ack_independent_contractor: z.boolean().refine(val => val === true, 'Must acknowledge independent contractor status'),
  ack_code_of_conduct: z.boolean().refine(val => val === true, 'Must acknowledge code of conduct'),
  ack_background_check: z.boolean().refine(val => val === true, 'Must acknowledge background check requirement'),
  ack_terms_conditions: z.boolean().refine(val => val === true, 'Must agree to terms and conditions'),

  // References
  references: z.array(CreateEventDirectorApplicationReferenceSchema).min(2, 'At least 2 references are required'),
});
export type CreateEventDirectorApplicationDto = z.infer<typeof CreateEventDirectorApplicationSchema>;

// Admin can create applications on behalf of users (full version)
export const AdminCreateEventDirectorApplicationSchema = CreateEventDirectorApplicationSchema.extend({
  user_id: z.string().uuid(),
  entry_method: ApplicationEntryMethodSchema.optional(),
});
export type AdminCreateEventDirectorApplicationDto = z.infer<typeof AdminCreateEventDirectorApplicationSchema>;

// Simplified admin quick-create - only essential fields, rest auto-populated
export const AdminQuickCreateEventDirectorApplicationSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().min(10, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  years_in_industry: z.number().min(0),
  travel_radius: z.string().min(1, 'Travel radius is required'),
  admin_notes: z.string().optional(),
});
export type AdminQuickCreateEventDirectorApplicationDto = z.infer<typeof AdminQuickCreateEventDirectorApplicationSchema>;

export const UpdateEventDirectorApplicationSchema = CreateEventDirectorApplicationSchema.partial();
export type UpdateEventDirectorApplicationDto = z.infer<typeof UpdateEventDirectorApplicationSchema>;

export const ReviewEventDirectorApplicationSchema = z.object({
  status: z.enum([ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]),
  admin_notes: z.string().optional(),
});
export type ReviewEventDirectorApplicationDto = z.infer<typeof ReviewEventDirectorApplicationSchema>;

export const EventDirectorApplicationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: ApplicationStatusSchema,
  application_date: z.coerce.date(),
  reviewed_date: z.coerce.date().nullable(),
  reviewed_by: z.string().uuid().nullable(),
  entered_by: z.string().uuid().nullable(),
  entry_method: ApplicationEntryMethodSchema,

  // Personal Information
  full_name: z.string(),
  preferred_name: z.string().nullable(),
  date_of_birth: z.coerce.date(),
  phone: z.string(),
  secondary_phone: z.string().nullable(),
  headshot_url: z.string().nullable(),

  // Location Information
  country: z.string(),
  state: z.string(),
  city: z.string(),
  zip: z.string(),
  travel_radius: z.string(),
  additional_regions: z.array(z.string()),

  // Availability
  weekend_availability: WeekendAvailabilitySchema,
  availability_notes: z.string().nullable(),

  // Experience
  years_in_industry: z.number(),
  event_management_experience: z.string(),
  team_management_experience: z.string(),
  equipment_resources: z.string().nullable(),
  specialized_formats: z.array(z.string()),

  // Essays
  essay_why_ed: z.string(),
  essay_qualifications: z.string(),
  essay_additional: z.string().nullable(),

  // Acknowledgments
  ack_independent_contractor: z.boolean(),
  ack_code_of_conduct: z.boolean(),
  ack_background_check: z.boolean(),
  ack_terms_conditions: z.boolean(),

  // Admin
  admin_notes: z.string().nullable(),

  // References
  references: z.array(EventDirectorApplicationReferenceSchema).optional(),

  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type EventDirectorApplication = z.infer<typeof EventDirectorApplicationSchema>;

// =============================================================================
// Event Director
// =============================================================================

export const EventDirectorSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  certification_date: z.coerce.date(),
  last_active_date: z.coerce.date().nullable(),

  // Location
  country: z.string(),
  state: z.string(),
  city: z.string(),
  zip: z.string(),
  travel_radius: z.string(),
  additional_regions: z.array(z.string()),

  // Availability
  weekend_availability: WeekendAvailabilitySchema,
  availability_notes: z.string().nullable(),

  // Contact
  phone: z.string(),
  secondary_phone: z.string().nullable(),

  // Stats
  total_events_directed: z.number(),
  average_rating: z.number(),
  rating_count: z.number(),

  // Admin
  admin_notes: z.string().nullable(),

  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type EventDirector = z.infer<typeof EventDirectorSchema>;

// Extended schema with user profile info for display
export const EventDirectorWithProfileSchema = EventDirectorSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
});
export type EventDirectorWithProfile = z.infer<typeof EventDirectorWithProfileSchema>;

export const UpdateEventDirectorSchema = z.object({
  is_active: z.boolean().optional(),
  travel_radius: z.string().optional(),
  additional_regions: z.array(z.string()).optional(),
  weekend_availability: WeekendAvailabilitySchema.optional(),
  availability_notes: z.string().optional(),
  phone: z.string().optional(),
  secondary_phone: z.string().optional(),
  admin_notes: z.string().optional(),
});
export type UpdateEventDirectorDto = z.infer<typeof UpdateEventDirectorSchema>;

// =============================================================================
// Event Director Season Qualification
// =============================================================================

export const EventDirectorSeasonQualificationSchema = z.object({
  id: z.string().uuid(),
  event_director_id: z.string().uuid(),
  season_year: z.number(),
  status: SeasonQualificationStatusSchema,
  events_directed: z.number(),
  events_required: z.number(),
  worlds_eligible: z.boolean(),
  admin_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type EventDirectorSeasonQualification = z.infer<typeof EventDirectorSeasonQualificationSchema>;

export const UpdateEventDirectorSeasonQualificationSchema = z.object({
  status: SeasonQualificationStatusSchema.optional(),
  events_required: z.number().optional(),
  worlds_eligible: z.boolean().optional(),
  admin_notes: z.string().optional(),
});
export type UpdateEventDirectorSeasonQualificationDto = z.infer<typeof UpdateEventDirectorSeasonQualificationSchema>;

// =============================================================================
// Event Director Assignment
// =============================================================================

export const CreateEventDirectorAssignmentSchema = z.object({
  event_id: z.string().uuid(),
  event_director_id: z.string().uuid(),
  request_type: AssignmentRequestTypeSchema,
});
export type CreateEventDirectorAssignmentDto = z.infer<typeof CreateEventDirectorAssignmentSchema>;

export const UpdateEventDirectorAssignmentSchema = z.object({
  status: EventAssignmentStatusSchema.optional(),
  admin_notes: z.string().optional(),
});
export type UpdateEventDirectorAssignmentDto = z.infer<typeof UpdateEventDirectorAssignmentSchema>;

export const EventDirectorAssignmentSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  event_director_id: z.string().uuid(),
  status: EventAssignmentStatusSchema,
  request_type: AssignmentRequestTypeSchema,
  requested_by: z.string().uuid().nullable(),
  requested_at: z.coerce.date(),
  responded_at: z.coerce.date().nullable(),
  decline_reason: z.string().nullable(),
  admin_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type EventDirectorAssignment = z.infer<typeof EventDirectorAssignmentSchema>;

// Extended schema with ED and event info
export const EventDirectorAssignmentWithDetailsSchema = EventDirectorAssignmentSchema.extend({
  event_director: EventDirectorWithProfileSchema.optional(),
  event: z.object({
    id: z.string().uuid(),
    name: z.string(),
    event_date: z.coerce.date(),
    city: z.string(),
    state: z.string(),
  }).optional(),
});
export type EventDirectorAssignmentWithDetails = z.infer<typeof EventDirectorAssignmentWithDetailsSchema>;
