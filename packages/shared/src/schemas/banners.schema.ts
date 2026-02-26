import { z } from 'zod';

// =============================================================================
// Banner System Enums
// =============================================================================

export enum BannerPosition {
  EVENTS_PAGE_TOP = 'events_page_top',
  HOMEPAGE_TOP = 'homepage_top',
  HOMEPAGE_MID = 'homepage_mid',
  HOMEPAGE_BOTTOM = 'homepage_bottom',
  SHOP_TOP = 'shop_top',
  RESULTS_TOP = 'results_top',
  LEADERBOARD_TOP = 'leaderboard_top',
  MEMBERS_TOP = 'members_top',
  SIDEBAR = 'sidebar',
}

export enum BannerStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum BannerSize {
  LEADERBOARD = '728x90',
  FULL_BANNER = '468x60',
  MEDIUM_RECTANGLE = '300x250',
  WIDE_SKYSCRAPER = '160x600',
  HALF_PAGE = '300x600',
  LARGE_LEADERBOARD = '970x90',
  BILLBOARD = '970x250',
  MOBILE_BANNER = '320x50',
  MOBILE_LEADERBOARD = '320x100',
}

// Zod Schemas for Enums
export const BannerPositionSchema = z.nativeEnum(BannerPosition);
export const BannerStatusSchema = z.nativeEnum(BannerStatus);
export const BannerSizeSchema = z.nativeEnum(BannerSize);

export const BannerSizeLabels: Record<BannerSize, string> = {
  [BannerSize.LEADERBOARD]: 'Leaderboard (728x90)',
  [BannerSize.FULL_BANNER]: 'Full Banner (468x60)',
  [BannerSize.MEDIUM_RECTANGLE]: 'Medium Rectangle (300x250)',
  [BannerSize.WIDE_SKYSCRAPER]: 'Wide Skyscraper (160x600)',
  [BannerSize.HALF_PAGE]: 'Half Page (300x600)',
  [BannerSize.LARGE_LEADERBOARD]: 'Large Leaderboard (970x90)',
  [BannerSize.BILLBOARD]: 'Billboard (970x250)',
  [BannerSize.MOBILE_BANNER]: 'Mobile Banner (320x50)',
  [BannerSize.MOBILE_LEADERBOARD]: 'Mobile Leaderboard (320x100)',
};

export const BannerPositionLabels: Record<BannerPosition, string> = {
  [BannerPosition.EVENTS_PAGE_TOP]: 'Events Page - Top',
  [BannerPosition.HOMEPAGE_TOP]: 'Homepage - Top',
  [BannerPosition.HOMEPAGE_MID]: 'Homepage - Middle',
  [BannerPosition.HOMEPAGE_BOTTOM]: 'Homepage - Bottom',
  [BannerPosition.SHOP_TOP]: 'Shop - Top',
  [BannerPosition.RESULTS_TOP]: 'Results - Top',
  [BannerPosition.LEADERBOARD_TOP]: 'Leaderboard - Top',
  [BannerPosition.MEMBERS_TOP]: 'Members - Top',
  [BannerPosition.SIDEBAR]: 'Sidebar',
};

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
  size: BannerSizeSchema.optional(),
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
  size: BannerSizeSchema.optional().nullable(),
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
  size: BannerSizeSchema.nullable().optional(),
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
  size: BannerSizeSchema.nullable().optional(),
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
  advertiserId: z.string().uuid().optional(),
  bannerSize: BannerSizeSchema.nullable().optional(),
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

// =============================================================================
// Analytics Filter & Report Schemas
// =============================================================================

export const BannerAnalyticsFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  advertiserId: z.string().uuid().optional(),
  size: BannerSizeSchema.optional(),
});
export type BannerAnalyticsFilter = z.infer<typeof BannerAnalyticsFilterSchema>;

export const SendBannerReportRequestSchema = z.object({
  advertiserId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  size: BannerSizeSchema.optional(),
});
export type SendBannerReportRequest = z.infer<typeof SendBannerReportRequestSchema>;
