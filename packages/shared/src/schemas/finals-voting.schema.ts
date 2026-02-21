import { z } from 'zod';
import {
  VotingSessionStatusSchema,
  VotingSessionStatus,
  VotingAnswerTypeSchema,
  VotingAnswerType,
} from './enums.schema.js';

// =============================================================================
// Voting Session
// =============================================================================

export const CreateVotingSessionSchema = z.object({
  season_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
}).refine(data => data.end_date > data.start_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
});
export type CreateVotingSessionDto = z.infer<typeof CreateVotingSessionSchema>;

export const UpdateVotingSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  status: VotingSessionStatusSchema.optional(),
});
export type UpdateVotingSessionDto = z.infer<typeof UpdateVotingSessionSchema>;

export const VotingSessionSchema = z.object({
  id: z.string().uuid(),
  season_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  status: VotingSessionStatusSchema,
  results_finalized_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type VotingSession = z.infer<typeof VotingSessionSchema>;

// =============================================================================
// Voting Category
// =============================================================================

export const CreateVotingCategorySchema = z.object({
  session_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  display_order: z.number().int().min(0).optional().default(0),
});
export type CreateVotingCategoryDto = z.infer<typeof CreateVotingCategorySchema>;

export const UpdateVotingCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  display_order: z.number().int().min(0).optional(),
});
export type UpdateVotingCategoryDto = z.infer<typeof UpdateVotingCategorySchema>;

export const VotingCategorySchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  display_order: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type VotingCategory = z.infer<typeof VotingCategorySchema>;

// =============================================================================
// Voting Question
// =============================================================================

export const CreateVotingQuestionSchema = z.object({
  category_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  image_url: z.string().optional().nullable(),
  answer_type: VotingAnswerTypeSchema,
  display_order: z.number().int().min(0).optional().default(0),
});
export type CreateVotingQuestionDto = z.infer<typeof CreateVotingQuestionSchema>;

export const UpdateVotingQuestionSchema = z.object({
  category_id: z.string().uuid().optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  image_url: z.string().optional().nullable(),
  answer_type: VotingAnswerTypeSchema.optional(),
  display_order: z.number().int().min(0).optional(),
});
export type UpdateVotingQuestionDto = z.infer<typeof UpdateVotingQuestionSchema>;

export const VotingQuestionSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  answer_type: VotingAnswerTypeSchema,
  display_order: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type VotingQuestion = z.infer<typeof VotingQuestionSchema>;

// =============================================================================
// Response Submission
// =============================================================================

export const SubmitResponsesSchema = z.object({
  session_id: z.string().uuid(),
  responses: z.array(z.object({
    question_id: z.string().uuid(),
    selected_member_id: z.string().uuid().optional().nullable(),
    selected_team_id: z.string().uuid().optional().nullable(),
    text_answer: z.string().max(500).optional().nullable(),
  })).min(1),
});
export type SubmitResponsesDto = z.infer<typeof SubmitResponsesSchema>;

// =============================================================================
// Clone Session
// =============================================================================

export const CloneSessionSchema = z.object({
  season_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
});
export type CloneSessionDto = z.infer<typeof CloneSessionSchema>;

// =============================================================================
// Entity Search
// =============================================================================

export interface EntitySearchResult {
  id: string;
  name: string;
  subtitle?: string;
  avatar_url?: string | null;
  meca_id?: number | null;
}

// =============================================================================
// Results
// =============================================================================

export interface MemberVoteResult {
  member_id: string;
  member_name: string;
  member_meca_id: number | null;
  member_avatar_url: string | null;
  vote_count: number;
}

export interface TeamVoteResult {
  team_id: string;
  team_name: string;
  team_logo_url: string | null;
  vote_count: number;
}

export interface VenueVoteResult {
  venue_name: string;
  vote_count: number;
}

export interface VotingQuestionResult {
  question_id: string;
  question_title: string;
  question_description: string | null;
  question_image_url: string | null;
  answer_type: VotingAnswerType;
  total_responses: number;
  // For profile-based questions (member, judge, event_director, retailer, manufacturer)
  member_votes?: MemberVoteResult[];
  // For team questions
  team_votes?: TeamVoteResult[];
  // For venue questions
  venue_votes?: VenueVoteResult[];
  // For text questions
  text_answers?: string[];
}

export interface VotingCategoryResult {
  category_id: string;
  category_name: string;
  category_description: string | null;
  questions: VotingQuestionResult[];
}

export interface VotingSessionResults {
  session: {
    id: string;
    title: string;
    description: string | null;
    season_id: string;
    status: string;
  };
  categories: VotingCategoryResult[];
  total_voters: number;
}

// =============================================================================
// Public Status (homepage/dashboard)
// =============================================================================

export interface VotingPublicStatus {
  has_active_session: boolean;
  session_id: string | null;
  title: string | null;
  status: VotingSessionStatus | null;
  start_date: string | null;
  end_date: string | null;
  user_has_voted?: boolean;
}
