import { z } from 'zod';

// ============================================================================
// Feature Requests — member-suggested features with community voting.
// Members submit ideas inside My MECA; other members vote 👍/👎 (a 👍 carries a
// 1–10 "how likely would you use this?" rating) with an optional comment that
// only admins can see. Requests have a 3-month voting window and a HIDDEN
// interest threshold (% of active members) admins tune per request.
// ============================================================================

// 1. TypeScript enum (single source of truth)
export enum FeatureRequestStatus {
  // Pre-board draft: a support-ticket conversion that didn't meet the minimum
  // description length. Invisible on the public board; the member gets ONE
  // edit-and-submit (within a 72h-default deadline) to take it live.
  NEEDS_DETAILS = 'needs_details',
  GATHERING_INTEREST = 'gathering_interest',
  INVESTIGATING = 'investigating',
  APPROVED = 'approved',
  IMPLEMENTED = 'implemented',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export enum FeatureRequestVote {
  UP = 'up',
  DOWN = 'down',
}

// Fixed category set (James 2026-08-12 — deliberately NO catch-all "Other").
export enum FeatureRequestCategory {
  WEBSITE = 'website',
  EVENTS = 'events',
  AWARDS = 'awards',
  FORMATS = 'formats',
  CLASSES = 'classes',
}

// 2. Zod schemas
export const FeatureRequestStatusSchema = z.nativeEnum(FeatureRequestStatus);
export const FeatureRequestVoteSchema = z.nativeEnum(FeatureRequestVote);
export const FeatureRequestCategorySchema = z.nativeEnum(FeatureRequestCategory);

// Submission quality gates: minimum description length kills one-liners —
// members are pitching the community for votes.
export const FEATURE_REQUEST_TITLE_MAX = 120;
export const FEATURE_REQUEST_DESCRIPTION_MIN = 200;
export const FEATURE_REQUEST_DESCRIPTION_MAX = 4000;
export const FEATURE_REQUEST_COMMENT_MAX = 1500; // ~200 words
export const FEATURE_REQUEST_RATING_MIN = 1;
export const FEATURE_REQUEST_RATING_MAX = 10;
export const FEATURE_REQUEST_MAX_OPEN_PER_MEMBER = 3;
export const FEATURE_REQUEST_VOTING_WINDOW_DAYS = 92; // ~3 months

export const CreateFeatureRequestSchema = z.object({
  title: z.string().trim().min(5).max(FEATURE_REQUEST_TITLE_MAX),
  description: z
    .string()
    .trim()
    .min(FEATURE_REQUEST_DESCRIPTION_MIN, 'Please describe your idea thoroughly — what it is, how you would use it, and why other members would benefit.')
    .max(FEATURE_REQUEST_DESCRIPTION_MAX),
  category: FeatureRequestCategorySchema,
});
export type CreateFeatureRequestDto = z.infer<typeof CreateFeatureRequestSchema>;

// Admin: convert a support ticket into a feature request on the member's
// behalf. No description minimum here — a too-thin description creates a
// NEEDS_DETAILS draft the member must complete instead of going live.
export const ConvertTicketToFeatureSchema = z.object({
  ticketId: z.string().uuid(),
  title: z.string().trim().min(5).max(FEATURE_REQUEST_TITLE_MAX),
  description: z.string().trim().min(1).max(FEATURE_REQUEST_DESCRIPTION_MAX),
  category: FeatureRequestCategorySchema,
  // The member's 3-open cap warns instead of blocking for conversions.
  overrideCap: z.boolean().optional(),
});
export type ConvertTicketToFeatureDto = z.infer<typeof ConvertTicketToFeatureSchema>;

// Member: one-time completion of a NEEDS_DETAILS draft (full minimums apply —
// completing it is what takes the idea live).
export const CompleteFeatureDraftSchema = CreateFeatureRequestSchema;
export type CompleteFeatureDraftDto = z.infer<typeof CompleteFeatureDraftSchema>;

// How long a member has to complete a NEEDS_DETAILS draft. Admin-configurable
// via this site_settings key; default 3 days (72 hours).
export const FEATURE_REQUEST_DETAILS_DEADLINE_SETTING = 'feature_request_details_deadline_days';
export const FEATURE_REQUEST_DETAILS_DEADLINE_DEFAULT_DAYS = 3;

export const CastFeatureVoteSchema = z
  .object({
    vote: FeatureRequestVoteSchema,
    // Required on a thumbs-up ("how likely are you to use this?"), absent on a
    // thumbs-down — enforced by the refinement below.
    rating: z.number().int().min(FEATURE_REQUEST_RATING_MIN).max(FEATURE_REQUEST_RATING_MAX).optional(),
    comment: z.string().trim().max(FEATURE_REQUEST_COMMENT_MAX).optional(),
  })
  .refine((v) => (v.vote === FeatureRequestVote.UP ? v.rating !== undefined : v.rating === undefined), {
    message: 'A thumbs-up needs a 1–10 usage rating; a thumbs-down must not include one.',
    path: ['rating'],
  });
export type CastFeatureVoteDto = z.infer<typeof CastFeatureVoteSchema>;

export const FeatureRequestMemberMessageSchema = z.object({
  body: z.string().trim().min(1).max(FEATURE_REQUEST_COMMENT_MAX),
});
export type FeatureRequestMemberMessageDto = z.infer<typeof FeatureRequestMemberMessageSchema>;

export const AdminFeatureMessageSchema = z.object({
  memberUserId: z.string().uuid(),
  body: z.string().trim().min(1).max(FEATURE_REQUEST_COMMENT_MAX),
});
export type AdminFeatureMessageDto = z.infer<typeof AdminFeatureMessageSchema>;

export const UpdateFeatureRequestStatusSchema = z.object({
  status: FeatureRequestStatusSchema,
  // Free text: a date ("Sept 2026"), a version/build ("v2.4"), or a time frame
  // ("next quarter", "within 6 months").
  plannedRelease: z.string().trim().max(120).optional().nullable(),
  publicNote: z.string().trim().max(500).optional().nullable(),
  // Declines are PRIVATE by default — the request leaves member-facing lists and
  // only the submitter sees the outcome. Set true to show the decline publicly.
  declinePublic: z.boolean().optional(),
});
export type UpdateFeatureRequestStatusDto = z.infer<typeof UpdateFeatureRequestStatusSchema>;

export const UpdateFeatureThresholdSchema = z.object({
  // Percent of ACTIVE members whose thumbs-up is needed (hidden from members).
  thresholdPct: z.number().min(0.5).max(100),
});
export type UpdateFeatureThresholdDto = z.infer<typeof UpdateFeatureThresholdSchema>;
