import { z } from 'zod';
import {
  PaymentTypeSchema,
  PaymentMethodSchema,
  PaymentStatusSchema,
  MembershipTypeSchema,
} from './enums.schema.js';

// Create Payment DTO
export const CreatePaymentSchema = z.object({
  userId: z.string().uuid(),
  membershipId: z.string().uuid().optional(),
  paymentType: PaymentTypeSchema,
  paymentMethod: PaymentMethodSchema,
  amount: z.number().min(0),
  currency: z.string().default('USD'),
  transactionId: z.string().optional(),
  externalPaymentId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  wordpressOrderId: z.string().optional(),
  wordpressSubscriptionId: z.string().optional(),
  description: z.string().optional(),
  paymentMetadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

// Process Payment DTO
export const ProcessPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  transactionId: z.string().optional(),
  paidAt: z.coerce.date().optional(),
});
export type ProcessPaymentDto = z.infer<typeof ProcessPaymentSchema>;

// Refund Payment DTO
export const RefundPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().min(1),
});
export type RefundPaymentDto = z.infer<typeof RefundPaymentSchema>;

// Sync WordPress Payment DTO
export const SyncWordpressPaymentSchema = z.object({
  wordpressOrderId: z.string(),
  wordpressSubscriptionId: z.string().optional(),
  userId: z.string().uuid(),
  membershipType: MembershipTypeSchema,
  amount: z.number().min(0),
  expirationDate: z.coerce.date(),
  paidAt: z.coerce.date(),
});
export type SyncWordpressPaymentDto = z.infer<typeof SyncWordpressPaymentSchema>;

// Payment Response Schema
export const PaymentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  membershipId: z.string().uuid().nullable(),
  paymentType: PaymentTypeSchema,
  paymentMethod: PaymentMethodSchema,
  paymentStatus: PaymentStatusSchema,
  amount: z.number(),
  currency: z.string(),
  transactionId: z.string().nullable(),
  externalPaymentId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  wordpressOrderId: z.string().nullable(),
  wordpressSubscriptionId: z.string().nullable(),
  description: z.string().nullable(),
  paymentMetadata: z.record(z.string(), z.unknown()).nullable(),
  paidAt: z.coerce.date().nullable(),
  refundedAt: z.coerce.date().nullable(),
  refundReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Payment = z.infer<typeof PaymentSchema>;

// Payment Stats Response
export const PaymentStatsSchema = z.object({
  totalPaid: z.number(),
  totalRefunded: z.number(),
  totalPending: z.number(),
  paymentCount: z.number(),
});
export type PaymentStats = z.infer<typeof PaymentStatsSchema>;

// Create Membership Payment Request
export const CreateMembershipPaymentSchema = z.object({
  userId: z.string().uuid(),
  membershipType: MembershipTypeSchema,
  amount: z.number().min(0),
  paymentMethod: PaymentMethodSchema,
  metadata: z
    .object({
      stripePaymentIntentId: z.string().optional(),
      stripeCustomerId: z.string().optional(),
      wordpressOrderId: z.string().optional(),
      wordpressSubscriptionId: z.string().optional(),
    })
    .optional(),
});
export type CreateMembershipPaymentDto = z.infer<typeof CreateMembershipPaymentSchema>;
