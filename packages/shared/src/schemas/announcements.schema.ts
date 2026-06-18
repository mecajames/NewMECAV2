import { z } from 'zod';
import { AnnouncementType, UserRoleSchema } from './enums.schema.js';

/**
 * Site-wide announcement banners shown above the navbar. Authored, scheduled,
 * styled, and audience-targeted by admins from the Notifications Center. The
 * body is sanitized HTML (rendered through DOMPurify on the client).
 */

export const AnnouncementTypeSchema = z.nativeEnum(AnnouncementType);

const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex color, e.g. #1e293b');

/**
 * Audience targeting. A viewer sees the announcement if they match ANY enabled
 * rule (logical OR), so rules can be freely combined — e.g. every Event Director
 * PLUS three named members. `everyone` includes logged-out visitors; all other
 * rules require a logged-in viewer.
 */
export const AnnouncementAudienceSchema = z.object({
  everyone: z.boolean().default(false), // public — includes anonymous/logged-out visitors
  authenticated: z.boolean().default(false), // any logged-in user
  activeMembers: z.boolean().default(false), // logged-in users whose membership is active
  staff: z.boolean().default(false), // is_staff users
  roles: z.array(UserRoleSchema).default([]), // specific roles (competitor, event_director, judge, retailer, manufacturer, admin)
  memberIds: z.array(z.string().uuid()).default([]), // specific members, by profile id
});
export type AnnouncementAudience = z.infer<typeof AnnouncementAudienceSchema>;

export const DEFAULT_ANNOUNCEMENT_AUDIENCE: AnnouncementAudience = {
  everyone: true,
  authenticated: false,
  activeMembers: false,
  staff: false,
  roles: [],
  memberIds: [],
};

const AnnouncementBaseSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000), // sanitized HTML
  type: AnnouncementTypeSchema.default(AnnouncementType.INFO),
  panelColor: HexColorSchema.nullish(), // null/undefined → derive from type
  textColor: HexColorSchema.nullish(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(1000).default(0),
  dismissible: z.boolean().default(true),
  audience: AnnouncementAudienceSchema.default(DEFAULT_ANNOUNCEMENT_AUDIENCE),
});

export const CreateAnnouncementSchema = AnnouncementBaseSchema.refine(
  (d) => d.endsAt > d.startsAt,
  { message: 'End date must be after the start date', path: ['endsAt'] },
);
export type CreateAnnouncementDto = z.infer<typeof CreateAnnouncementSchema>;

export const UpdateAnnouncementSchema = AnnouncementBaseSchema.partial();
export type UpdateAnnouncementDto = z.infer<typeof UpdateAnnouncementSchema>;

export const AnnouncementSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  type: AnnouncementTypeSchema,
  panelColor: z.string().nullable(),
  textColor: z.string().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean(),
  priority: z.number().int(),
  dismissible: z.boolean(),
  audience: AnnouncementAudienceSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Announcement = z.infer<typeof AnnouncementSchema>;

/** Trimmed shape returned to the public banner (no scheduling/audience internals). */
export const PublicAnnouncementSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  type: AnnouncementTypeSchema,
  panelColor: z.string().nullable(),
  textColor: z.string().nullable(),
  dismissible: z.boolean(),
  priority: z.number().int(),
});
export type PublicAnnouncement = z.infer<typeof PublicAnnouncementSchema>;
