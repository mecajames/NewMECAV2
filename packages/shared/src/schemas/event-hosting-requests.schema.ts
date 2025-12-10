import { z } from 'zod';
import {
  EventHostingRequestStatusSchema,
  EDAssignmentStatusSchema,
  FinalApprovalStatusSchema,
  EventTypeOptionSchema,
  HostTypeSchema,
  IndoorOutdoorSchema,
  SenderRoleSchema,
  RecipientTypeSchema,
} from './enums.schema';

// Create Event Hosting Request DTO (API format with snake_case)
export const CreateEventHostingRequestApiSchema = z.object({
  // Basic Info
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  business_name: z.string().optional(),
  host_type: HostTypeSchema.optional(),
  user_id: z.string().uuid().optional(),

  // Venue Information
  venue_name: z.string().optional(),
  venue_type: z.string().optional(),
  indoor_outdoor: IndoorOutdoorSchema.optional(),
  power_available: z.boolean().optional(),

  // Event Information
  event_name: z.string().min(1),
  event_type: EventTypeOptionSchema.optional(),
  event_type_other: z.string().optional(),
  event_description: z.string().optional(),

  // Event Dates
  event_start_date: z.coerce.date(),
  event_start_time: z.string().optional(),
  event_end_date: z.coerce.date().optional(),
  event_end_time: z.string().optional(),

  // Multi-Day Support
  is_multi_day: z.boolean().optional(),
  day_2_date: z.coerce.date().optional(),
  day_2_start_time: z.string().optional(),
  day_2_end_time: z.string().optional(),
  day_3_date: z.coerce.date().optional(),
  day_3_start_time: z.string().optional(),
  day_3_end_time: z.string().optional(),

  // Competition Formats
  competition_formats: z.array(z.string()).optional(),

  // Location
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),

  // Additional Info
  expected_participants: z.number().int().positive().optional(),
  has_hosted_before: z.boolean().optional(),
  estimated_budget: z.number().min(0).optional(),

  // Registration & Fees
  has_registration_fee: z.boolean().optional(),
  estimated_entry_fee: z.number().min(0).optional(),
  member_entry_fee: z.number().min(0).optional(),
  non_member_entry_fee: z.number().min(0).optional(),
  has_gate_fee: z.boolean().optional(),
  gate_fee: z.number().min(0).optional(),
  pre_registration_available: z.boolean().optional(),

  // Additional Services
  additional_services: z.array(z.string()).optional(),
  other_services_details: z.string().optional(),
  other_requests: z.string().optional(),
  additional_info: z.string().optional(),
});
export type CreateEventHostingRequestApiDto = z.infer<typeof CreateEventHostingRequestApiSchema>;

// Event Hosting Request Response Schema
export const EventHostingRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  businessName: z.string().nullable(),
  hostType: HostTypeSchema.nullable(),
  venueName: z.string().nullable(),
  venueType: z.string().nullable(),
  indoorOutdoor: IndoorOutdoorSchema.nullable(),
  powerAvailable: z.boolean().nullable(),
  eventName: z.string(),
  eventType: EventTypeOptionSchema.nullable(),
  eventTypeOther: z.string().nullable(),
  eventDescription: z.string().nullable(),
  eventStartDate: z.coerce.date(),
  eventStartTime: z.string().nullable(),
  eventEndDate: z.coerce.date().nullable(),
  eventEndTime: z.string().nullable(),
  isMultiDay: z.boolean(),
  day2Date: z.coerce.date().nullable(),
  day2StartTime: z.string().nullable(),
  day2EndTime: z.string().nullable(),
  day3Date: z.coerce.date().nullable(),
  day3StartTime: z.string().nullable(),
  day3EndTime: z.string().nullable(),
  competitionFormats: z.array(z.string()).nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  expectedParticipants: z.number().nullable(),
  hasHostedBefore: z.boolean().nullable(),
  estimatedBudget: z.number().nullable(),
  hasRegistrationFee: z.boolean().nullable(),
  estimatedEntryFee: z.number().nullable(),
  memberEntryFee: z.number().nullable(),
  nonMemberEntryFee: z.number().nullable(),
  hasGateFee: z.boolean().nullable(),
  gateFee: z.number().nullable(),
  preRegistrationAvailable: z.boolean().nullable(),
  additionalServices: z.array(z.string()).nullable(),
  otherServicesDetails: z.string().nullable(),
  otherRequests: z.string().nullable(),
  additionalInfo: z.string().nullable(),
  status: EventHostingRequestStatusSchema,
  adminResponse: z.string().nullable(),
  adminResponseDate: z.coerce.date().nullable(),
  adminResponderId: z.string().uuid().nullable(),
  assignedEventDirectorId: z.string().uuid().nullable(),
  assignedAt: z.coerce.date().nullable(),
  assignmentNotes: z.string().nullable(),
  edStatus: EDAssignmentStatusSchema.nullable(),
  edResponseDate: z.coerce.date().nullable(),
  edRejectionReason: z.string().nullable(),
  finalStatus: FinalApprovalStatusSchema.nullable(),
  finalStatusReason: z.string().nullable(),
  awaitingRequestorResponse: z.boolean(),
  createdEventId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type EventHostingRequest = z.infer<typeof EventHostingRequestSchema>;

// Assign to Event Director Request
export const AssignToEventDirectorSchema = z.object({
  requestId: z.string().uuid(),
  eventDirectorId: z.string().uuid(),
  adminId: z.string().uuid(),
  notes: z.string().optional(),
});
export type AssignToEventDirectorDto = z.infer<typeof AssignToEventDirectorSchema>;

// ED Accept/Reject Assignment
export const EDAssignmentResponseSchema = z.object({
  requestId: z.string().uuid(),
  eventDirectorId: z.string().uuid(),
  reason: z.string().optional(), // Required for rejection
});
export type EDAssignmentResponseDto = z.infer<typeof EDAssignmentResponseSchema>;

// Set Final Approval Request
export const SetFinalApprovalSchema = z.object({
  requestId: z.string().uuid(),
  adminId: z.string().uuid(),
  finalStatus: FinalApprovalStatusSchema,
  reason: z.string().optional(),
});
export type SetFinalApprovalDto = z.infer<typeof SetFinalApprovalSchema>;

// Add Message to Request
export const AddMessageSchema = z.object({
  requestId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderRole: SenderRoleSchema,
  messageText: z.string().min(1),
  isPrivate: z.boolean().optional().default(false),
  recipientType: RecipientTypeSchema.optional(),
});
export type AddMessageDto = z.infer<typeof AddMessageSchema>;

// Event Hosting Request Message Response
export const EventHostingRequestMessageSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderRole: SenderRoleSchema,
  message: z.string(),
  isPrivate: z.boolean(),
  recipientType: RecipientTypeSchema.nullable(),
  createdAt: z.coerce.date(),
});
export type EventHostingRequestMessage = z.infer<typeof EventHostingRequestMessageSchema>;

// Request Stats
export const EventHostingRequestStatsSchema = z.object({
  total: z.number(),
  pending: z.number(),
  underReview: z.number(),
  approved: z.number(),
  rejected: z.number(),
});
export type EventHostingRequestStats = z.infer<typeof EventHostingRequestStatsSchema>;

// Event Director Stats
export const EventDirectorStatsSchema = z.object({
  assigned: z.number(),
  pendingReview: z.number(),
  accepted: z.number(),
});
export type EventDirectorStats = z.infer<typeof EventDirectorStatsSchema>;
