import { z } from 'zod';
import { UserRole, MembershipStatus, UserRoleSchema, MembershipStatusSchema } from './enums.schema';

// Create Profile DTO
export const CreateProfileSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  role: UserRoleSchema.optional().default(UserRole.USER),
  membership_status: MembershipStatusSchema.optional().default(MembershipStatus.NONE),
  membership_expiry: z.coerce.date().optional(),
  meca_id: z.string().optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  is_public: z.boolean().optional().default(false),
});
export type CreateProfileDto = z.infer<typeof CreateProfileSchema>;

// Profile Response Schema
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
  role: UserRoleSchema,
  membership_status: MembershipStatusSchema,
  membership_expiry: z.coerce.date().nullable(),
  meca_id: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// Update Profile Schema
export const UpdateProfileSchema = CreateProfileSchema.partial();
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

// Profile Stats Response
export const ProfileStatsSchema = z.object({
  totalUsers: z.number(),
  totalMembers: z.number(),
});
export type ProfileStats = z.infer<typeof ProfileStatsSchema>;

// Public Profile Schema (limited fields)
export const PublicProfileSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  meca_id: z.string().nullable(),
  membership_status: MembershipStatusSchema,
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;
