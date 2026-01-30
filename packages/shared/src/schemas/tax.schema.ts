import { z } from 'zod';

// =============================================================================
// Tax Rate Schemas
// =============================================================================

export const TaxRateSchema = z.object({
  id: z.string().uuid().optional(),
  country: z.string().min(2).max(2), // ISO 3166-1 alpha-2
  state: z.string().optional(), // State/province code
  rate: z.number().min(0).max(1), // 0.0825 for 8.25%
  name: z.string(), // "Sales Tax", "GST", etc.
  isActive: z.boolean().default(true),
});
export type TaxRate = z.infer<typeof TaxRateSchema>;

export const CreateTaxRateSchema = TaxRateSchema.omit({ id: true });
export type CreateTaxRateDto = z.infer<typeof CreateTaxRateSchema>;

export const UpdateTaxRateSchema = TaxRateSchema.partial().omit({ id: true });
export type UpdateTaxRateDto = z.infer<typeof UpdateTaxRateSchema>;

// =============================================================================
// Tax Calculation Schemas
// =============================================================================

export const TaxCalculationRequestSchema = z.object({
  subtotal: z.string(),
  billingAddress: z.object({
    country: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});
export type TaxCalculationRequest = z.infer<typeof TaxCalculationRequestSchema>;

export const TaxCalculationResponseSchema = z.object({
  subtotal: z.string(),
  taxAmount: z.string(),
  taxRate: z.number(),
  taxName: z.string(),
  total: z.string(),
  breakdown: z.array(z.object({
    name: z.string(),
    rate: z.number(),
    amount: z.string(),
  })),
});
export type TaxCalculationResponse = z.infer<typeof TaxCalculationResponseSchema>;

// =============================================================================
// Tax Configuration Schema
// =============================================================================

export const TaxConfigurationSchema = z.object({
  enabled: z.boolean().default(false),
  defaultRate: z.number().default(0),
  defaultName: z.string().default('Tax'),
  calculateByLocation: z.boolean().default(true),
});
export type TaxConfiguration = z.infer<typeof TaxConfigurationSchema>;
