import { z } from 'zod';

// =============================================================================
// Member Gallery Image Schemas
// =============================================================================

export const CreateGalleryImageSchema = z.object({
  image_url: z.string().url(),
  caption: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().optional(),
  is_public: z.boolean().optional().default(true),
});

export type CreateGalleryImageDto = z.infer<typeof CreateGalleryImageSchema>;

export const UpdateGalleryImageSchema = z.object({
  caption: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().optional(),
  is_public: z.boolean().optional(),
});

export type UpdateGalleryImageDto = z.infer<typeof UpdateGalleryImageSchema>;

export const GalleryImageSchema = z.object({
  id: z.string().uuid(),
  member_id: z.string().uuid(),
  image_url: z.string(),
  caption: z.string().nullable(),
  sort_order: z.number(),
  is_public: z.boolean(),
  uploaded_at: z.coerce.date(),
});

export type GalleryImage = z.infer<typeof GalleryImageSchema>;

// =============================================================================
// Request Schemas
// =============================================================================

export const ReorderGalleryImagesSchema = z.object({
  image_ids: z.array(z.string().uuid()),
});

export type ReorderGalleryImagesDto = z.infer<typeof ReorderGalleryImagesSchema>;

// =============================================================================
// Response Schemas
// =============================================================================

export const GalleryResponseSchema = z.object({
  images: z.array(GalleryImageSchema),
  total: z.number(),
});

export type GalleryResponse = z.infer<typeof GalleryResponseSchema>;
