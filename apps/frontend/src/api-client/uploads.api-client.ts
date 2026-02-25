import axios from '@/lib/axios';

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
  bucket: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Valid upload destinations.
 *
 * Admin-only:
 *   - product-images: Shop product images (documents/meca-stage-products)
 *   - media-library: Media library files (documents/media)
 *   - banner-images: Ad banner images
 *   - event-images: Event images
 *   - rulebooks: Rulebook PDFs (documents/rulebooks)
 *
 * Member (user-scoped):
 *   - profile-images: Profile avatars
 *   - cover-images: Profile cover images
 *   - gallery-images: Profile gallery images
 *   - team-logos: Team logo images
 *   - team-gallery: Team gallery images
 *   - team-banners: Team banner images
 */
export type UploadDestination =
  | 'product-images'
  | 'media-library'
  | 'banner-images'
  | 'event-images'
  | 'voting-item-images'
  | 'rulebooks'
  | 'profile-images'
  | 'cover-images'
  | 'gallery-images'
  | 'team-logos'
  | 'team-gallery'
  | 'team-banners';

/**
 * Uploads a file through the backend to Supabase storage.
 *
 * @param file - The file to upload
 * @param destination - Where to store the file (determines bucket, folder, and access rules)
 * @param entityId - Optional entity ID for scoping (e.g., team ID for team uploads)
 * @returns Upload result with the public URL
 */
export async function uploadFile(
  file: File,
  destination: UploadDestination,
  entityId?: string,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('destination', destination);
  if (entityId) {
    formData.append('entityId', entityId);
  }

  const response = await axios.post('/api/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
