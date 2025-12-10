import { z } from 'zod';
import { RegistrationStatusSchema, PaymentStatusSchema } from './enums.schema';

// Create Event Registration DTO (API format with snake_case)
export const CreateEventRegistrationApiSchema = z.object({
  event_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  vehicle_info: z.string().optional(),
  competition_class: z.string().optional(),
  registration_status: RegistrationStatusSchema.optional(),
  payment_status: PaymentStatusSchema.optional(),
  amount_paid: z.number().min(0).optional(),
  transaction_id: z.string().optional(),
  registered_at: z.coerce.date().optional(),
});
export type CreateEventRegistrationApiDto = z.infer<typeof CreateEventRegistrationApiSchema>;

// Create Event Registration DTO (internal camelCase format)
export const CreateEventRegistrationSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  vehicleInfo: z.string().optional(),
  competitionClass: z.string().optional(),
  registrationStatus: RegistrationStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  amountPaid: z.number().min(0).optional(),
  transactionId: z.string().optional(),
  registeredAt: z.coerce.date().optional(),
});
export type CreateEventRegistrationDto = z.infer<typeof CreateEventRegistrationSchema>;

// Event Registration Response Schema
export const EventRegistrationSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  vehicleInfo: z.string().nullable(),
  competitionClass: z.string().nullable(),
  registrationStatus: RegistrationStatusSchema,
  paymentStatus: PaymentStatusSchema,
  amountPaid: z.number().nullable(),
  transactionId: z.string().nullable(),
  registeredAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type EventRegistration = z.infer<typeof EventRegistrationSchema>;

// Update Event Registration Schema
export const UpdateEventRegistrationSchema = CreateEventRegistrationSchema.partial();
export type UpdateEventRegistrationDto = z.infer<typeof UpdateEventRegistrationSchema>;

// Confirm Registration Request
export const ConfirmRegistrationSchema = z.object({
  id: z.string().uuid(),
});
export type ConfirmRegistrationDto = z.infer<typeof ConfirmRegistrationSchema>;

// Update Payment Status Request
export const UpdatePaymentStatusSchema = z.object({
  id: z.string().uuid(),
  status: PaymentStatusSchema,
  transactionId: z.string().optional(),
});
export type UpdatePaymentStatusDto = z.infer<typeof UpdatePaymentStatusSchema>;

// Event Registration Stats
export const EventRegistrationStatsSchema = z.object({
  totalRegistrations: z.number(),
});
export type EventRegistrationStats = z.infer<typeof EventRegistrationStatsSchema>;
