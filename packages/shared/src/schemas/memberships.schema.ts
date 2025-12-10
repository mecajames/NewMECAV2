import { z } from 'zod';
import { MembershipTypeSchema, PaymentStatusSchema } from './enums.schema';

// Create Guest Membership DTO
export const CreateGuestMembershipSchema = z.object({
  email: z.string().email(),
  membershipTypeConfigId: z.string().uuid(),
  membershipType: MembershipTypeSchema,
  amountPaid: z.number().min(0),
  stripePaymentIntentId: z.string().optional(),
  transactionId: z.string().optional(),
  billingFirstName: z.string().min(1),
  billingLastName: z.string().min(1),
  billingPhone: z.string().optional(),
  billingAddress: z.string().min(1),
  billingCity: z.string().min(1),
  billingState: z.string().min(1),
  billingPostalCode: z.string().min(1),
  billingCountry: z.string().optional().default('USA'),
  teamName: z.string().optional(),
  teamDescription: z.string().optional(),
  businessName: z.string().optional(),
  businessWebsite: z.string().url().optional(),
});
export type CreateGuestMembershipDto = z.infer<typeof CreateGuestMembershipSchema>;

// Create User Membership DTO
export const CreateUserMembershipSchema = z.object({
  userId: z.string().uuid(),
  membershipTypeConfigId: z.string().uuid(),
  membershipType: MembershipTypeSchema,
  amountPaid: z.number().min(0),
  stripePaymentIntentId: z.string().optional(),
  transactionId: z.string().optional(),
});
export type CreateUserMembershipDto = z.infer<typeof CreateUserMembershipSchema>;

// Membership Response Schema (for API responses)
export const MembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  email: z.string().email().nullable(),
  membershipType: MembershipTypeSchema,
  membershipTypeConfigId: z.string().uuid().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  amountPaid: z.number(),
  paymentStatus: PaymentStatusSchema,
  stripePaymentIntentId: z.string().nullable(),
  transactionId: z.string().nullable(),
  billingFirstName: z.string().nullable(),
  billingLastName: z.string().nullable(),
  billingPhone: z.string().nullable(),
  billingAddress: z.string().nullable(),
  billingCity: z.string().nullable(),
  billingState: z.string().nullable(),
  billingPostalCode: z.string().nullable(),
  billingCountry: z.string().nullable(),
  teamName: z.string().nullable(),
  teamDescription: z.string().nullable(),
  businessName: z.string().nullable(),
  businessWebsite: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Membership = z.infer<typeof MembershipSchema>;

// Update Membership Schema
export const UpdateMembershipSchema = MembershipSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateMembershipDto = z.infer<typeof UpdateMembershipSchema>;

// Link Memberships to User Request
export const LinkMembershipsToUserSchema = z.object({
  email: z.string().email(),
  userId: z.string().uuid(),
});
export type LinkMembershipsToUserDto = z.infer<typeof LinkMembershipsToUserSchema>;

// Renew Membership Request
export const RenewMembershipSchema = z.object({
  userId: z.string().uuid(),
  membershipType: z.string(),
});
export type RenewMembershipDto = z.infer<typeof RenewMembershipSchema>;
