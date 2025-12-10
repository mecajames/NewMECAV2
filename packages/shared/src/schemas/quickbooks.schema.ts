import { z } from "zod";

// Create Sales Receipt DTO
export const CreateSalesReceiptSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  membershipTypeConfigId: z.string().uuid(),
  amount: z.number().min(0),
  paymentDate: z.coerce.date(),
  stripePaymentIntentId: z.string(),
  billingAddress: z.object({
    line1: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
});
export type CreateSalesReceiptDto = z.infer<typeof CreateSalesReceiptSchema>;

// QuickBooks Company Info Response
export const QuickBooksCompanyInfoSchema = z.object({
  companyName: z.string(),
  realmId: z.string(),
  isConnected: z.boolean(),
  lastSyncAt: z.coerce.date().optional(),
});
export type QuickBooksCompanyInfo = z.infer<typeof QuickBooksCompanyInfoSchema>;

// QuickBooks Connection Schema
export const QuickBooksConnectionSchema = z.object({
  id: z.string().uuid(),
  realmId: z.string(),
  companyName: z.string().nullable(),
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.coerce.date(),
  refreshTokenExpiresAt: z.coerce.date(),
  isActive: z.boolean(),
  lastSyncAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type QuickBooksConnection = z.infer<typeof QuickBooksConnectionSchema>;

// QuickBooks Item Schema
export const QuickBooksItemSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Description: z.string().optional(),
  UnitPrice: z.number().optional(),
  Type: z.string(),
});
export type QuickBooksItem = z.infer<typeof QuickBooksItemSchema>;

// QuickBooks Account Schema
export const QuickBooksAccountSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  AccountType: z.string(),
  AccountSubType: z.string().optional(),
});
export type QuickBooksAccount = z.infer<typeof QuickBooksAccountSchema>;

