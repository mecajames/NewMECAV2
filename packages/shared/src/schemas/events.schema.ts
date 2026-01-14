import { z } from 'zod';
import { EventStatusSchema, EventTypeSchema } from './enums.schema.js';

// Create Event DTO (API format with snake_case)
export const CreateEventApiSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  event_date: z.coerce.date(),
  registration_deadline: z.coerce.date().optional(),
  venue_name: z.string().min(1),
  venue_address: z.string().min(1),
  venue_city: z.string().optional(),
  venue_state: z.string().optional(),
  venue_postal_code: z.string().optional(),
  venue_country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  flyer_url: z.string().url().optional(),
  event_director_id: z.string().uuid().optional(),
  season_id: z.string().uuid().optional(),
  status: EventStatusSchema.optional(),
  max_participants: z.number().int().positive().optional(),
  registration_fee: z.number().min(0).optional(),
  member_entry_fee: z.number().min(0).optional(),
  non_member_entry_fee: z.number().min(0).optional(),
  has_gate_fee: z.boolean().optional(),
  gate_fee: z.number().min(0).optional(),
  points_multiplier: z.number().int().min(0).max(4).optional(),
  event_type: EventTypeSchema.optional(),
  formats: z.array(z.string()).optional(),
});
export type CreateEventApiDto = z.infer<typeof CreateEventApiSchema>;

// Create Event DTO (internal camelCase format)
export const CreateEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  eventDate: z.coerce.date(),
  registrationDeadline: z.coerce.date().optional(),
  venueName: z.string().min(1),
  venueAddress: z.string().min(1),
  venueCity: z.string().optional(),
  venueState: z.string().optional(),
  venuePostalCode: z.string().optional(),
  venueCountry: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  flyerUrl: z.string().url().optional(),
  eventDirectorId: z.string().uuid().optional(),
  seasonId: z.string().uuid().optional(),
  status: EventStatusSchema.optional(),
  maxParticipants: z.number().int().positive().optional(),
  registrationFee: z.number().min(0).optional(),
  memberEntryFee: z.number().min(0).optional(),
  nonMemberEntryFee: z.number().min(0).optional(),
  hasGateFee: z.boolean().optional(),
  gateFee: z.number().min(0).optional(),
  pointsMultiplier: z.number().int().min(0).max(4).optional(),
  eventType: EventTypeSchema.optional(),
  formats: z.array(z.string()).optional(),
});
export type CreateEventDto = z.infer<typeof CreateEventSchema>;

// Event Response Schema
export const EventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  eventDate: z.coerce.date(),
  registrationDeadline: z.coerce.date().nullable(),
  venueName: z.string(),
  venueAddress: z.string(),
  venueCity: z.string().nullable(),
  venueState: z.string().nullable(),
  venuePostalCode: z.string().nullable(),
  venueCountry: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  flyerUrl: z.string().nullable(),
  eventDirectorId: z.string().uuid().nullable(),
  seasonId: z.string().uuid().nullable(),
  status: EventStatusSchema,
  maxParticipants: z.number().nullable(),
  registrationFee: z.number().nullable(),
  memberEntryFee: z.number().nullable(),
  nonMemberEntryFee: z.number().nullable(),
  hasGateFee: z.boolean(),
  gateFee: z.number().nullable(),
  pointsMultiplier: z.number(),
  eventType: EventTypeSchema.nullable(),
  formats: z.array(z.string()).nullable(),
  multiDayGroupId: z.string().uuid().nullable(),
  dayNumber: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Event = z.infer<typeof EventSchema>;

// Update Event Schema
export const UpdateEventSchema = CreateEventSchema.partial();
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;

// Create Multi-Day Event Request
export const CreateMultiDayEventSchema = z.object({
  data: CreateEventApiSchema,
  numberOfDays: z.number().int().min(1).max(3),
  dayDates: z.array(z.string().datetime()),
});
export type CreateMultiDayEventDto = z.infer<typeof CreateMultiDayEventSchema>;

// Event Stats Response
export const EventStatsSchema = z.object({
  totalEvents: z.number(),
});
export type EventStats = z.infer<typeof EventStatsSchema>;
