import { z } from 'zod';
import { MembershipCategorySchema, ManufacturerTierSchema } from './enums.schema.js';

// Create Membership Type Config DTO
export const CreateMembershipTypeConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: MembershipCategorySchema,
  tier: ManufacturerTierSchema.optional(),
  price: z.number().min(0),
  currency: z.string().default('USD'),
  benefits: z.array(z.string()).optional(),
  requiredFields: z.array(z.string()).optional(),
  optionalFields: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  showOnPublicSite: z.boolean().optional(),
  displayOrder: z.number().int().optional().default(0),
  stripePriceId: z.string().optional(),
  stripeProductId: z.string().optional(),
  quickbooksItemId: z.string().optional(),
  quickbooksAccountId: z.string().optional(),
});
export type CreateMembershipTypeConfigDto = z.infer<typeof CreateMembershipTypeConfigSchema>;

// Update Membership Type Config DTO
export const UpdateMembershipTypeConfigSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tier: ManufacturerTierSchema.optional(),
  price: z.number().min(0).optional(),
  currency: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  requiredFields: z.array(z.string()).optional(),
  optionalFields: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  showOnPublicSite: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  stripePriceId: z.string().optional(),
  stripeProductId: z.string().optional(),
  quickbooksItemId: z.string().optional(),
  quickbooksAccountId: z.string().optional(),
});
export type UpdateMembershipTypeConfigDto = z.infer<typeof UpdateMembershipTypeConfigSchema>;

// Membership Type Config Response Schema
export const MembershipTypeConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: MembershipCategorySchema,
  tier: ManufacturerTierSchema.nullable(),
  price: z.number(),
  currency: z.string().nullable(),
  benefits: z.array(z.string()).nullable(),
  requiredFields: z.array(z.string()).nullable(),
  optionalFields: z.array(z.string()).nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  showOnPublicSite: z.boolean(),
  displayOrder: z.number(),
  stripePriceId: z.string().nullable(),
  stripeProductId: z.string().nullable(),
  quickbooksItemId: z.string().nullable(),
  quickbooksAccountId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MembershipTypeConfig = z.infer<typeof MembershipTypeConfigSchema>;

// Display Order Update Item
export const DisplayOrderUpdateSchema = z.object({
  id: z.string().uuid(),
  displayOrder: z.number().int(),
});
export type DisplayOrderUpdate = z.infer<typeof DisplayOrderUpdateSchema>;
