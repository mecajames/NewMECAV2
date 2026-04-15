import { z } from 'zod';

// ── Enums ────────────────────────────────────────────────────────────────────

export enum CouponDiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}
export const CouponDiscountTypeSchema = z.nativeEnum(CouponDiscountType);

export enum CouponScope {
  ALL = 'all',
  MEMBERSHIP = 'membership',
  SHOP = 'shop',
}
export const CouponScopeSchema = z.nativeEnum(CouponScope);

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
export const CouponStatusSchema = z.nativeEnum(CouponStatus);

// ── Create DTO ───────────────────────────────────────────────────────────────

export const CreateCouponSchema = z.object({
  code: z.string().min(3).max(50).optional(), // if omitted, auto-generated
  description: z.string().max(255).optional(),
  discountType: CouponDiscountTypeSchema,
  discountValue: z.number().positive(),
  scope: CouponScopeSchema.optional().default(CouponScope.ALL),
  applicableProductIds: z.array(z.string().uuid()).optional(),
  applicableMembershipTypeConfigIds: z.array(z.string().uuid()).optional(),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  maxUses: z.number().int().min(0).optional(),       // 0 or omitted = unlimited
  maxUsesPerUser: z.number().int().min(0).optional().default(1),
  newMembersOnly: z.boolean().optional().default(false),
  status: CouponStatusSchema.optional().default(CouponStatus.ACTIVE),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  // Code generation options (used when code is omitted)
  codePrefix: z.string().max(20).optional(),
  codeSuffix: z.string().max(20).optional(),
  codeLength: z.number().int().min(4).max(20).optional().default(8),
});
export type CreateCouponDto = z.infer<typeof CreateCouponSchema>;

// ── Update DTO ───────────────────────────────────────────────────────────────

export const UpdateCouponSchema = z.object({
  description: z.string().max(255).optional(),
  discountType: CouponDiscountTypeSchema.optional(),
  discountValue: z.number().positive().optional(),
  scope: CouponScopeSchema.optional(),
  applicableProductIds: z.array(z.string().uuid()).nullable().optional(),
  applicableMembershipTypeConfigIds: z.array(z.string().uuid()).nullable().optional(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  maxUses: z.number().int().min(0).nullable().optional(),
  maxUsesPerUser: z.number().int().min(0).nullable().optional(),
  newMembersOnly: z.boolean().optional(),
  status: CouponStatusSchema.optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});
export type UpdateCouponDto = z.infer<typeof UpdateCouponSchema>;

// ── Validate Request ─────────────────────────────────────────────────────────

export const ValidateCouponRequestSchema = z.object({
  code: z.string().min(1),
  scope: CouponScopeSchema,
  subtotal: z.number().min(0),
  productIds: z.array(z.string().uuid()).optional(),
  membershipTypeConfigId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
});
export type ValidateCouponRequestDto = z.infer<typeof ValidateCouponRequestSchema>;

// ── Validate Response ────────────────────────────────────────────────────────

export const CouponValidationResultSchema = z.object({
  valid: z.boolean(),
  couponId: z.string().uuid().optional(),
  discountType: CouponDiscountTypeSchema.optional(),
  discountValue: z.number().optional(),
  discountAmount: z.number().optional(),
  message: z.string(),
});
export type CouponValidationResult = z.infer<typeof CouponValidationResultSchema>;

// ── Response ─────────────────────────────────────────────────────────────────

export const CouponResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  description: z.string().nullable(),
  discount_type: z.string(),
  discount_value: z.number(),
  scope: z.string(),
  applicable_product_ids: z.array(z.string()).nullable(),
  applicable_membership_type_config_ids: z.array(z.string()).nullable(),
  min_order_amount: z.number().nullable(),
  max_discount_amount: z.number().nullable(),
  max_uses: z.number().nullable(),
  max_uses_per_user: z.number().nullable(),
  new_members_only: z.boolean(),
  status: z.string(),
  starts_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  times_used: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CouponResponse = z.infer<typeof CouponResponseSchema>;

// ── Code Preview Request ─────────────────────────────────────────────────────

export const CodePreviewRequestSchema = z.object({
  prefix: z.string().max(20).optional(),
  suffix: z.string().max(20).optional(),
  length: z.number().int().min(4).max(20).optional().default(8),
});
export type CodePreviewRequestDto = z.infer<typeof CodePreviewRequestSchema>;
