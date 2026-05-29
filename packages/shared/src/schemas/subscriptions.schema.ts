import { z } from 'zod';

// =============================================================================
// Stripe Subscription Bundle
// Normalized snapshot of the "real data" pulled from Stripe for a subscription.
// Produced by StripeService.getSubscriptionDetails and surfaced to the admin
// before assigning, and persisted into the billing record.
// =============================================================================

export const SubscriptionBundleSchema = z.object({
  id: z.string(),
  status: z.string(), // active | trialing | past_due | canceled | unpaid | incomplete | ...
  customerId: z.string().nullable(),
  customerEmail: z.string().nullable(),
  productName: z.string().nullable(),
  amount: z.number().nullable(), // dollars
  currency: z.string().nullable(),
  interval: z.string().nullable(), // month | year | ...
  currentPeriodEnd: z.coerce.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  latestInvoiceId: z.string().nullable(),
  paymentIntentId: z.string().nullable(),
  chargeId: z.string().nullable(),
});
export type SubscriptionBundle = z.infer<typeof SubscriptionBundleSchema>;

// =============================================================================
// Assign / Reassign a Stripe subscription to a membership
// =============================================================================

export const AssignSubscriptionDtoSchema = z.object({
  stripeSubscriptionId: z.string().min(3),
});
export type AssignSubscriptionDto = z.infer<typeof AssignSubscriptionDtoSchema>;

// Result of an assignment: the updated membership id + the live bundle, and —
// when the sub was moved off another membership — which one it came from.
export const AssignSubscriptionResultSchema = z.object({
  membershipId: z.string().uuid(),
  bundle: SubscriptionBundleSchema,
  movedFromMembershipId: z.string().uuid().nullable(),
});
export type AssignSubscriptionResult = z.infer<typeof AssignSubscriptionResultSchema>;

// =============================================================================
// Subscriptions list (dedicated billing page)
// =============================================================================

export const SubscriptionSource = z.enum(['stripe', 'legacy']);
export type SubscriptionSourceType = z.infer<typeof SubscriptionSource>;

export const SubscriptionListItemSchema = z.object({
  membershipId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  mecaId: z.number().nullable(),
  memberName: z.string().nullable(),
  email: z.string().nullable(),
  membershipType: z.string().nullable(),
  source: SubscriptionSource,
  stripeSubscriptionId: z.string().nullable(),
  paymentStatus: z.string(),
  amountPaid: z.number().nullable(),
  endDate: z.coerce.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
});
export type SubscriptionListItem = z.infer<typeof SubscriptionListItemSchema>;

// =============================================================================
// Legacy conversion report
// =============================================================================

export const LegacyConversionDtoSchema = z.object({
  dryRun: z.boolean().default(true),
});
export type LegacyConversionDto = z.infer<typeof LegacyConversionDtoSchema>;

export const LegacyConversionEntrySchema = z.object({
  membershipId: z.string().uuid(),
  mecaId: z.number().nullable(),
  email: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  reason: z.string().optional(),
});
export type LegacyConversionEntry = z.infer<typeof LegacyConversionEntrySchema>;

export const LegacyConversionReportSchema = z.object({
  dryRun: z.boolean(),
  scanned: z.number(),
  linked: z.array(LegacyConversionEntrySchema),
  reclassified: z.array(LegacyConversionEntrySchema),
  skipped: z.array(LegacyConversionEntrySchema),
});
export type LegacyConversionReport = z.infer<typeof LegacyConversionReportSchema>;
