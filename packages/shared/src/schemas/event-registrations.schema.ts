import { z } from 'zod';
import { RegistrationStatusSchema, PaymentStatusSchema } from './enums.schema.js';

// =============================================================================
// Event Registration Class Schema
// =============================================================================

export const EventRegistrationClassSchema = z.object({
  id: z.string().uuid(),
  competitionClassId: z.string().uuid(),
  format: z.string(),
  className: z.string(),
  feeCharged: z.number(),
  createdAt: z.coerce.date(),
});
export type EventRegistrationClass = z.infer<typeof EventRegistrationClassSchema>;

// =============================================================================
// Create Event Registration Checkout DTO
// =============================================================================

export const CreateEventRegistrationCheckoutSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  vehicleYear: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleInfo: z.string().optional(),
  notes: z.string().optional(),
  classes: z.array(z.object({
    competitionClassId: z.string().uuid(),
    format: z.string(),
    className: z.string(),
  })).min(1),
  includeMembership: z.boolean().optional(),
  membershipTypeConfigId: z.string().uuid().optional(),
});
export type CreateEventRegistrationCheckoutDto = z.infer<typeof CreateEventRegistrationCheckoutSchema>;

// =============================================================================
// Event Registration Pricing Schema
// =============================================================================

export const EventRegistrationPricingSchema = z.object({
  perClassFee: z.number(),
  classesSubtotal: z.number(),
  membershipCost: z.number(),
  total: z.number(),
  savings: z.number(),
  isMemberPricing: z.boolean(),
});
export type EventRegistrationPricing = z.infer<typeof EventRegistrationPricingSchema>;

// =============================================================================
// Event Registration Response Schema (Full)
// =============================================================================

export const EventRegistrationFullSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  userId: z.string().uuid().nullable().optional(),
  email: z.string().email().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  vehicleYear: z.string().nullable().optional(),
  vehicleMake: z.string().nullable().optional(),
  vehicleModel: z.string().nullable().optional(),
  vehicleInfo: z.string().nullable().optional(),
  registrationStatus: RegistrationStatusSchema,
  paymentStatus: PaymentStatusSchema,
  amountPaid: z.number().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  stripePaymentIntentId: z.string().nullable().optional(),
  stripeCustomerId: z.string().nullable().optional(),
  membershipPurchasedDuringRegistration: z.boolean().optional(),
  membershipId: z.string().uuid().nullable().optional(),
  checkInCode: z.string().nullable().optional(),
  qrCodeData: z.string().nullable().optional(),
  checkedIn: z.boolean().optional(),
  checkedInAt: z.coerce.date().nullable().optional(),
  checkedInById: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  registeredAt: z.coerce.date().nullable().optional(),
  classes: z.array(EventRegistrationClassSchema).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type EventRegistrationFull = z.infer<typeof EventRegistrationFullSchema>;

// =============================================================================
// Check-In Response Schema
// =============================================================================

export const CheckInResponseSchema = z.object({
  registration: z.object({
    id: z.string().uuid(),
    checkInCode: z.string(),
    registeredAt: z.coerce.date().optional(),
    amountPaid: z.number().optional(),
    paymentStatus: PaymentStatusSchema,
    checkedIn: z.boolean(),
    checkedInAt: z.coerce.date().optional(),
  }),
  competitor: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    isMember: z.boolean(),
    mecaId: z.string().optional(),
  }),
  event: z.object({
    id: z.string().uuid(),
    title: z.string(),
    eventDate: z.coerce.date(),
  }),
  classes: z.array(z.object({
    format: z.string(),
    className: z.string(),
    feeCharged: z.number(),
  })),
  vehicle: z.object({
    year: z.string().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    info: z.string().optional(),
  }),
});
export type CheckInResponse = z.infer<typeof CheckInResponseSchema>;

// =============================================================================
// Admin List Response Schema
// =============================================================================

export const AdminEventRegistrationListSchema = z.object({
  registrations: z.array(EventRegistrationFullSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});
export type AdminEventRegistrationList = z.infer<typeof AdminEventRegistrationListSchema>;

// =============================================================================
// Event Check-In Stats Schema
// =============================================================================

export const EventCheckInStatsSchema = z.object({
  total: z.number(),
  checkedIn: z.number(),
  pending: z.number(),
});
export type EventCheckInStats = z.infer<typeof EventCheckInStatsSchema>;

// =============================================================================
// Legacy Schemas (for backward compatibility)
// =============================================================================

// Create Event Registration DTO (API format with snake_case)
export const CreateEventRegistrationApiSchema = z.object({
  event_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  full_name: z.string().min(1).optional(),
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
  fullName: z.string().min(1).optional(),
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
  fullName: z.string().nullable().optional(),
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
