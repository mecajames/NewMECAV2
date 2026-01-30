import { z } from 'zod';
import {
  ApplicationStatus,
  ApplicationStatusSchema,
  JudgeLevel,
  JudgeLevelSchema,
  JudgeSpecialty,
  JudgeSpecialtySchema,
  WeekendAvailability,
  WeekendAvailabilitySchema,
  ApplicationEntryMethod,
  ApplicationEntryMethodSchema,
  SeasonQualificationStatus,
  SeasonQualificationStatusSchema,
  EventAssignmentRole,
  EventAssignmentRoleSchema,
  EventAssignmentStatus,
  EventAssignmentStatusSchema,
  AssignmentRequestType,
  AssignmentRequestTypeSchema,
} from './enums.schema.js';

// =============================================================================
// Judge Application Reference
// =============================================================================

export const CreateJudgeApplicationReferenceSchema = z.object({
  name: z.string().min(1, 'Reference name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  company_name: z.string().optional(),
});
export type CreateJudgeApplicationReferenceDto = z.infer<typeof CreateJudgeApplicationReferenceSchema>;

export const JudgeApplicationReferenceSchema = z.object({
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
export type JudgeApplicationReference = z.infer<typeof JudgeApplicationReferenceSchema>;

// =============================================================================
// Judge Application
// =============================================================================

export const CreateJudgeApplicationSchema = z.object({
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
  industry_positions: z.string().min(1, 'Industry positions are required'),
  company_names: z.string().optional(),
  education_training: z.string().optional(),
  competition_history: z.string().optional(),
  judging_experience: z.string().optional(),

  // Specialties
  specialty: JudgeSpecialtySchema,
  sub_specialties: z.array(z.string()).default([]),
  additional_skills: z.string().optional(),

  // Essays
  essay_why_judge: z.string().min(100, 'Essay must be at least 100 characters'),
  essay_qualifications: z.string().min(100, 'Essay must be at least 100 characters'),
  essay_additional: z.string().optional(),

  // Acknowledgments
  ack_independent_contractor: z.boolean().refine(val => val === true, 'Must acknowledge independent contractor status'),
  ack_code_of_conduct: z.boolean().refine(val => val === true, 'Must acknowledge code of conduct'),
  ack_background_check: z.boolean().refine(val => val === true, 'Must acknowledge background check requirement'),
  ack_terms_conditions: z.boolean().refine(val => val === true, 'Must agree to terms and conditions'),

  // References
  references: z.array(CreateJudgeApplicationReferenceSchema).min(2, 'At least 2 references are required'),
});
export type CreateJudgeApplicationDto = z.infer<typeof CreateJudgeApplicationSchema>;

// Admin can create applications on behalf of users (full version)
export const AdminCreateJudgeApplicationSchema = CreateJudgeApplicationSchema.extend({
  user_id: z.string().uuid(),
  entry_method: ApplicationEntryMethodSchema.optional(),
});
export type AdminCreateJudgeApplicationDto = z.infer<typeof AdminCreateJudgeApplicationSchema>;

// Simplified admin quick-create - only essential fields, rest auto-populated
export const AdminQuickCreateJudgeApplicationSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().min(10, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  specialty: JudgeSpecialtySchema,
  years_in_industry: z.number().min(0),
  travel_radius: z.string().min(1, 'Travel radius is required'),
  admin_notes: z.string().optional(),
});
export type AdminQuickCreateJudgeApplicationDto = z.infer<typeof AdminQuickCreateJudgeApplicationSchema>;

export const UpdateJudgeApplicationSchema = CreateJudgeApplicationSchema.partial();
export type UpdateJudgeApplicationDto = z.infer<typeof UpdateJudgeApplicationSchema>;

export const ReviewJudgeApplicationSchema = z.object({
  status: z.enum([ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]),
  admin_notes: z.string().optional(),
  judge_level: JudgeLevelSchema.optional(), // Only used when approving
});
export type ReviewJudgeApplicationDto = z.infer<typeof ReviewJudgeApplicationSchema>;

export const JudgeApplicationSchema = z.object({
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
  industry_positions: z.string(),
  company_names: z.string().nullable(),
  education_training: z.string().nullable(),
  competition_history: z.string().nullable(),
  judging_experience: z.string().nullable(),

  // Specialties
  specialty: JudgeSpecialtySchema,
  sub_specialties: z.array(z.string()),
  additional_skills: z.string().nullable(),

  // Essays
  essay_why_judge: z.string(),
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
  references: z.array(JudgeApplicationReferenceSchema).optional(),

  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type JudgeApplication = z.infer<typeof JudgeApplicationSchema>;

// =============================================================================
// Judge
// =============================================================================

export const JudgeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_id: z.string().uuid().nullable(),
  level: JudgeLevelSchema,
  specialty: JudgeSpecialtySchema,
  sub_specialties: z.array(z.string()),
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
  total_events_judged: z.number(),
  average_rating: z.number(),
  rating_count: z.number(),

  // Admin
  admin_notes: z.string().nullable(),

  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Judge = z.infer<typeof JudgeSchema>;

// Extended schema with user profile info for display
export const JudgeWithProfileSchema = JudgeSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    avatar_url: z.string().nullable(),
  }),
});
export type JudgeWithProfile = z.infer<typeof JudgeWithProfileSchema>;

export const UpdateJudgeSchema = z.object({
  level: JudgeLevelSchema.optional(),
  specialty: JudgeSpecialtySchema.optional(),
  sub_specialties: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  travel_radius: z.string().optional(),
  additional_regions: z.array(z.string()).optional(),
  admin_notes: z.string().optional(),
  bio: z.string().optional(),
  headshot_url: z.string().url().optional(),
});
export type UpdateJudgeDto = z.infer<typeof UpdateJudgeSchema>;

// =============================================================================
// Judge Level History
// =============================================================================

export const JudgeLevelHistorySchema = z.object({
  id: z.string().uuid(),
  judge_id: z.string().uuid(),
  previous_level: JudgeLevelSchema,
  new_level: JudgeLevelSchema,
  reason: z.string().nullable(),
  changed_by: z.string().uuid(),
  changed_at: z.coerce.date(),
});
export type JudgeLevelHistory = z.infer<typeof JudgeLevelHistorySchema>;

// =============================================================================
// Judge Season Qualification
// =============================================================================

export const JudgeSeasonQualificationSchema = z.object({
  id: z.string().uuid(),
  judge_id: z.string().uuid(),
  season_year: z.number(),
  status: SeasonQualificationStatusSchema,
  events_judged: z.number(),
  events_required: z.number(),
  worlds_eligible: z.boolean(),
  admin_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type JudgeSeasonQualification = z.infer<typeof JudgeSeasonQualificationSchema>;

export const UpdateJudgeSeasonQualificationSchema = z.object({
  status: SeasonQualificationStatusSchema.optional(),
  events_required: z.number().optional(),
  worlds_eligible: z.boolean().optional(),
  admin_notes: z.string().optional(),
});
export type UpdateJudgeSeasonQualificationDto = z.infer<typeof UpdateJudgeSeasonQualificationSchema>;

// =============================================================================
// Event Judge Assignment
// =============================================================================

export const CreateEventJudgeAssignmentSchema = z.object({
  event_id: z.string().uuid(),
  judge_id: z.string().uuid(),
  role: EventAssignmentRoleSchema.default(EventAssignmentRole.SUPPORTING),
  request_type: AssignmentRequestTypeSchema,
});
export type CreateEventJudgeAssignmentDto = z.infer<typeof CreateEventJudgeAssignmentSchema>;

export const UpdateEventJudgeAssignmentSchema = z.object({
  role: EventAssignmentRoleSchema.optional(),
  status: EventAssignmentStatusSchema.optional(),
  decline_reason: z.string().optional(),
  admin_notes: z.string().optional(),
});
export type UpdateEventJudgeAssignmentDto = z.infer<typeof UpdateEventJudgeAssignmentSchema>;

export const EventJudgeAssignmentSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  judge_id: z.string().uuid(),
  role: EventAssignmentRoleSchema,
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
export type EventJudgeAssignment = z.infer<typeof EventJudgeAssignmentSchema>;

// Extended schema with judge and event info
export const EventJudgeAssignmentWithDetailsSchema = EventJudgeAssignmentSchema.extend({
  judge: JudgeWithProfileSchema.optional(),
  event: z.object({
    id: z.string().uuid(),
    name: z.string(),
    event_date: z.coerce.date(),
    city: z.string(),
    state: z.string(),
  }).optional(),
});
export type EventJudgeAssignmentWithDetails = z.infer<typeof EventJudgeAssignmentWithDetailsSchema>;

// =============================================================================
// Admin Direct Judge Creation (without application)
// =============================================================================

export const AdminDirectCreateJudgeSchema = z.object({
  user_id: z.string().uuid(),
  level: JudgeLevelSchema.default(JudgeLevel.IN_TRAINING),
  specialty: JudgeSpecialtySchema,
  sub_specialties: z.array(z.string()).default([]),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().default('USA'),
  travel_radius: z.string().default('100 miles'),
  additional_regions: z.array(z.string()).default([]),
  admin_notes: z.string().optional(),
  enable_permission: z.boolean().default(false), // If true, enable canApplyJudge on profile
});
export type AdminDirectCreateJudgeDto = z.infer<typeof AdminDirectCreateJudgeSchema>;
