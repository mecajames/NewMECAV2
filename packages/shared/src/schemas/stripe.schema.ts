import { z } from "zod";

// Create Payment Intent DTO
export const CreatePaymentIntentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().default("usd"),
  membershipTypeConfigId: z.string().uuid(),
  membershipTypeName: z.string().min(1),
  email: z.string().email(),
  metadata: z.record(z.string(), z.string()).optional(),
});
export type CreatePaymentIntentDto = z.infer<typeof CreatePaymentIntentSchema>;

// Payment Intent Result Response
export const PaymentIntentResultSchema = z.object({
  clientSecret: z.string(),
  paymentIntentId: z.string(),
  stagingMode: z.boolean().optional(),
  message: z.string().optional(),
});
export type PaymentIntentResult = z.infer<typeof PaymentIntentResultSchema>;

// Find or Create Customer Request
export const FindOrCreateCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});
export type FindOrCreateCustomerDto = z.infer<typeof FindOrCreateCustomerSchema>;

// Create Refund Request
export const CreateRefundSchema = z.object({
  paymentIntentId: z.string(),
  reason: z.string().optional(),
});
export type CreateRefundDto = z.infer<typeof CreateRefundSchema>;

