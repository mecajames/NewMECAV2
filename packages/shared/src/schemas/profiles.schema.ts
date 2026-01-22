import { z } from 'zod';
import { UserRole, MembershipStatus, UserRoleSchema, MembershipStatusSchema } from './enums.schema.js';

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

// =============================================================================
// Judge and Event Director Permission Schemas
// =============================================================================

// Update Judge Permission DTO
export const UpdateJudgePermissionSchema = z.object({
  enabled: z.boolean(),
  autoComplete: z.boolean().optional(),
  expirationDate: z.string().nullable().optional(),
  judgeLevel: z.string().optional(),
});
export type UpdateJudgePermissionDto = z.infer<typeof UpdateJudgePermissionSchema>;

// Update Event Director Permission DTO
export const UpdateEdPermissionSchema = z.object({
  enabled: z.boolean(),
  autoComplete: z.boolean().optional(),
  expirationDate: z.string().nullable().optional(),
});
export type UpdateEdPermissionDto = z.infer<typeof UpdateEdPermissionSchema>;

// Judge/ED Status Response Schema
export const JudgeEdStatusSchema = z.object({
  judge: z.object({
    permissionEnabled: z.boolean(),
    status: z.string(),
    grantedAt: z.string().nullable(),
    grantedBy: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }).nullable(),
    expirationDate: z.string().nullable(),
    judgeRecord: z.object({
      id: z.string().uuid(),
      level: z.string(),
      isActive: z.boolean(),
    }).nullable(),
    application: z.object({
      id: z.string().uuid(),
      status: z.string(),
      submittedAt: z.string(),
    }).nullable(),
  }),
  eventDirector: z.object({
    permissionEnabled: z.boolean(),
    status: z.string(),
    grantedAt: z.string().nullable(),
    grantedBy: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }).nullable(),
    expirationDate: z.string().nullable(),
    edRecord: z.object({
      id: z.string().uuid(),
      isActive: z.boolean(),
    }).nullable(),
    application: z.object({
      id: z.string().uuid(),
      status: z.string(),
      submittedAt: z.string(),
    }).nullable(),
  }),
  eventsJudged: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    date: z.string(),
  })),
  eventsDirected: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    date: z.string(),
  })),
});
export type JudgeEdStatus = z.infer<typeof JudgeEdStatusSchema>;
