import { z } from 'zod';

// =============================================================================
// Banner System Enums
// =============================================================================

export enum BannerPosition {
  EVENTS_PAGE_TOP = 'events_page_top',
  // Future positions can be added here
}

export enum BannerStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

// Zod Schemas for Enums
export const BannerPositionSchema = z.nativeEnum(BannerPosition);
export const BannerStatusSchema = z.nativeEnum(BannerStatus);

// =============================================================================
// Advertiser Schemas
// =============================================================================

export const CreateAdvertiserSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateAdvertiserDto = z.infer<typeof CreateAdvertiserSchema>;

export const UpdateAdvertiserSchema = CreateAdvertiserSchema.partial();
export type UpdateAdvertiserDto = z.infer<typeof UpdateAdvertiserSchema>;

export const AdvertiserSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string(),
  contactName: z.string(),
  contactEmail: z.string().email(),
  contactPhone: z.string().nullable(),
  website: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Advertiser = z.infer<typeof AdvertiserSchema>;

// =============================================================================
// Banner Schemas
// =============================================================================

export const CreateBannerSchema = z.object({
  name: z.string().min(1, 'Banner name is required'),
  imageUrl: z.string().min(1, 'Image is required'),
  clickUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  position: BannerPositionSchema,
  status: BannerStatusSchema.optional().default(BannerStatus.DRAFT),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  priority: z.number().int().min(0).optional().default(0),
  advertiserId: z.string().uuid('Advertiser is required'),
  altText: z.string().optional(),
  // Frequency capping
  maxImpressionsPerUser: z.number().int().min(0).optional().default(0), // 0 = unlimited
  maxTotalImpressions: z.number().int().min(0).optional().default(0), // 0 = unlimited
  rotationWeight: z.number().int().min(1).max(1000).optional().default(100),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});
export type CreateBannerDto = z.infer<typeof CreateBannerSchema>;

export const UpdateBannerSchema = z.object({
  name: z.string().min(1, 'Banner name is required').optional(),
  imageUrl: z.string().min(1).optional(),
  clickUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  position: BannerPositionSchema.optional(),
  status: BannerStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  priority: z.number().int().min(0).optional(),
  advertiserId: z.string().uuid('Advertiser is required').optional(),
  altText: z.string().optional(),
  // Frequency capping
  maxImpressionsPerUser: z.number().int().min(0).optional(),
  maxTotalImpressions: z.number().int().min(0).optional(),
  rotationWeight: z.number().int().min(1).max(1000).optional(),
});
export type UpdateBannerDto = z.infer<typeof UpdateBannerSchema>;

export const BannerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  imageUrl: z.string(),
  clickUrl: z.string().nullable(),
  position: BannerPositionSchema,
  status: BannerStatusSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  priority: z.number(),
  advertiserId: z.string().uuid(),
  advertiser: AdvertiserSchema.optional(),
  altText: z.string().nullable(),
  // Frequency capping
  maxImpressionsPerUser: z.number(),
  maxTotalImpressions: z.number(),
  rotationWeight: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Banner = z.infer<typeof BannerSchema>;

// Public Banner Response (minimal data for frontend display)
export const PublicBannerSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string(),
  clickUrl: z.string().nullable(),
  altText: z.string().nullable(),
  maxImpressionsPerUser: z.number(), // For client-side frequency capping
});
export type PublicBanner = z.infer<typeof PublicBannerSchema>;

// =============================================================================
// Engagement Schemas
// =============================================================================

export const RecordEngagementSchema = z.object({
  bannerId: z.string().uuid(),
  type: z.enum(['impression', 'click']),
});
export type RecordEngagementDto = z.infer<typeof RecordEngagementSchema>;

export const BannerEngagementSchema = z.object({
  id: z.string().uuid(),
  bannerId: z.string().uuid(),
  date: z.coerce.date(),
  impressions: z.number(),
  clicks: z.number(),
});
export type BannerEngagement = z.infer<typeof BannerEngagementSchema>;

// =============================================================================
// Analytics Response Schema
// =============================================================================

export const BannerAnalyticsSchema = z.object({
  bannerId: z.string().uuid(),
  bannerName: z.string(),
  advertiserName: z.string(),
  totalImpressions: z.number(),
  totalClicks: z.number(),
  clickThroughRate: z.number(), // clicks / impressions * 100
  dailyStats: z.array(z.object({
    date: z.coerce.date(),
    impressions: z.number(),
    clicks: z.number(),
  })),
});
export type BannerAnalytics = z.infer<typeof BannerAnalyticsSchema>;
