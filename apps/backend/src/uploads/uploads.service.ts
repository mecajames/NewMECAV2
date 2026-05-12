import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

/**
 * Defines upload destinations with their bucket, folder, and access rules.
 */
interface UploadDestination {
  bucket: string;
  folder: string;
  /** If true, only admins can upload. If false, any authenticated user can upload (scoped to their user ID). */
  adminOnly: boolean;
  allowedMimeTypes: string[];
  maxSizeBytes: number;
}

/**
 * Registry of all allowed upload destinations.
 * Frontend passes a `destination` key (e.g., "product-images") and the backend
 * resolves it to the correct bucket/folder with access control.
 */
const UPLOAD_DESTINATIONS: Record<string, UploadDestination> = {
  // Admin-only destinations
  'product-images': {
    bucket: 'documents',
    folder: 'meca-stage-products',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  'media-library': {
    bucket: 'documents',
    folder: 'media',
    adminOnly: true,
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },
  'banner-images': {
    bucket: 'banner-images',
    folder: '',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'event-images': {
    bucket: 'event-images',
    folder: '',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'voting-item-images': {
    bucket: 'documents',
    folder: 'voting-items',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  'qa-screenshots': {
    bucket: 'documents',
    folder: 'qa-screenshots',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'world-finals-images': {
    bucket: 'documents',
    folder: 'world-finals-images',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'retailer-images': {
    bucket: 'documents',
    folder: 'retailer-images',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  'manufacturer-images': {
    bucket: 'documents',
    folder: 'manufacturer-images',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  'rulebooks': {
    bucket: 'documents',
    folder: 'rulebooks',
    adminOnly: true,
    allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },

  // Support ticket attachments — both members and admins can paste/upload
  // screenshots onto the ticket thread. Restricted to images so we don't
  // turn the ticket pipeline into a generic file dropbox.
  'ticket-attachments': {
    bucket: 'documents',
    folder: 'ticket-attachments',
    adminOnly: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },

  // Member destinations (user-scoped: file path includes user ID)
  'profile-images': {
    bucket: 'profile-images',
    folder: 'avatars',
    adminOnly: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  'cover-images': {
    bucket: 'profile-images',
    folder: 'covers',
    adminOnly: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'gallery-images': {
    bucket: 'profile-images',
    folder: 'gallery',
    adminOnly: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'team-logos': {
    bucket: 'profile-images',
    folder: 'team-logos',
    adminOnly: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  'forever-member-images': {
    bucket: 'documents',
    folder: 'forever-members',
    adminOnly: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  'team-gallery': {
    bucket: 'profile-images',
    folder: 'team-gallery',
    adminOnly: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'team-banners': {
    bucket: 'profile-images',
    folder: 'team-banners',
    adminOnly: false,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
};

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
  bucket: string;
  fileSize: number;
  mimeType: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly supabaseAdmin: SupabaseAdminService) {}

  /**
   * Returns the list of valid destination keys (for documentation/validation).
   */
  getDestinations(): string[] {
    return Object.keys(UPLOAD_DESTINATIONS);
  }

  /**
   * Uploads a file to the configured Supabase storage destination.
   *
   * @param file - The uploaded file from multer
   * @param destination - A key from UPLOAD_DESTINATIONS (e.g., 'product-images')
   * @param userId - The authenticated user's ID
   * @param isAdmin - Whether the user has admin/staff access
   * @param entityId - Optional entity ID for scoping (e.g., team ID for team uploads)
   * @param subfolder - Optional subfolder within the destination folder (e.g., 'faq-docs')
   * @param preserveFilename - If true (admin only), use the original filename instead of generating a unique one
   */
  async uploadFile(
    file: Express.Multer.File,
    destination: string,
    userId: string,
    isAdmin: boolean,
    entityId?: string,
    subfolder?: string,
    preserveFilename?: boolean,
  ): Promise<UploadResult> {
    // 1. Validate destination exists
    const dest = UPLOAD_DESTINATIONS[destination];
    if (!dest) {
      throw new BadRequestException(
        `Invalid upload destination: "${destination}". Valid destinations: ${Object.keys(UPLOAD_DESTINATIONS).join(', ')}`,
      );
    }

    // 2. Check authorization
    if (dest.adminOnly && !isAdmin) {
      throw new ForbiddenException(`Admin access required to upload to "${destination}"`);
    }

    // 3. Validate file type
    if (!dest.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed for "${destination}". Allowed types: ${dest.allowedMimeTypes.join(', ')}`,
      );
    }

    // 4. Validate file size
    if (file.size > dest.maxSizeBytes) {
      const maxMB = Math.round(dest.maxSizeBytes / (1024 * 1024));
      throw new BadRequestException(
        `File too large (${Math.round(file.size / (1024 * 1024))}MB). Maximum size for "${destination}" is ${maxMB}MB.`,
      );
    }

    // 5. Build file path
    const fileExt = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    let fileName: string;
    if (preserveFilename && dest.adminOnly) {
      // Admin requested original filename — sanitize but keep the name
      const sanitized = file.originalname
        .replace(/[^a-zA-Z0-9_\-\.]/g, '-') // Sanitize (keep dots for extension)
        .replace(/-+/g, '-') // Collapse multiple dashes
        .substring(0, 80);
      fileName = sanitized;
    } else {
      const sanitizedName = file.originalname
        .replace(/\.[^/.]+$/, '') // Remove extension
        .replace(/[^a-zA-Z0-9_-]/g, '_') // Sanitize
        .substring(0, 50); // Limit length
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      fileName = `${uniqueId}-${sanitizedName}.${fileExt}`;
    }

    // Sanitize subfolder if provided (strip leading/trailing slashes, allow only safe chars)
    const cleanSubfolder = subfolder
      ? subfolder.replace(/[^a-zA-Z0-9_\-/]/g, '').replace(/^\/+|\/+$/g, '')
      : '';

    let storagePath: string;
    if (dest.adminOnly) {
      // Admin uploads go directly into the destination folder (with optional subfolder)
      const baseFolder = cleanSubfolder
        ? (dest.folder ? `${dest.folder}/${cleanSubfolder}` : cleanSubfolder)
        : dest.folder;
      storagePath = baseFolder ? `${baseFolder}/${fileName}` : fileName;
    } else {
      // Member uploads are scoped to the user's (or entity's) folder
      const scopeId = entityId || userId;
      storagePath = dest.folder
        ? `${dest.folder}/${scopeId}/${fileName}`
        : `${scopeId}/${fileName}`;
    }

    // 6. Upload to Supabase storage using service role key
    this.logger.log(`Uploading file to ${dest.bucket}/${storagePath} (${file.size} bytes, ${file.mimetype})`);

    const { error: uploadError } = await this.supabaseAdmin.getClient().storage
      .from(dest.bucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: preserveFilename || false,
      });

    if (uploadError) {
      this.logger.error(`Upload failed: ${uploadError.message}`);
      throw new BadRequestException(`Upload failed: ${uploadError.message}`);
    }

    // 7. Get public URL
    const { data: { publicUrl: rawPublicUrl } } = this.supabaseAdmin.getClient().storage
      .from(dest.bucket)
      .getPublicUrl(storagePath);

    // Rewrite URL to use public-facing storage URL if configured.
    // This is needed when the Supabase instance uses an internal HTTP URL
    // (e.g., http://IP:8000) but images need to be served over HTTPS
    // via a reverse proxy (e.g., https://domain.com/supabase/).
    const publicUrl = this.rewriteStorageUrl(rawPublicUrl);

    this.logger.log(`Upload successful: ${publicUrl}`);

    return {
      publicUrl,
      storagePath,
      bucket: dest.bucket,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Rewrites a Supabase storage URL to use the public-facing STORAGE_PUBLIC_URL.
   * When STORAGE_PUBLIC_URL is set, replaces the Supabase base URL so that
   * browsers can load images through an HTTPS reverse proxy instead of
   * hitting an internal HTTP IP directly (which causes mixed content errors).
   */
  private rewriteStorageUrl(url: string): string {
    const storagePublicUrl = process.env.STORAGE_PUBLIC_URL;
    if (!storagePublicUrl) {
      return url;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl || !url.startsWith(supabaseUrl)) {
      return url;
    }

    return url.replace(supabaseUrl, storagePublicUrl);
  }

  /**
   * Deletes a file from Supabase storage.
   */
  async deleteFile(bucket: string, storagePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseAdmin.getClient().storage
        .from(bucket)
        .remove([storagePath]);

      if (error) {
        this.logger.error(`Failed to delete file from ${bucket}/${storagePath}: ${error.message}`);
        return false;
      }

      this.logger.log(`Deleted file: ${bucket}/${storagePath}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Exception deleting file: ${err.message}`);
      return false;
    }
  }
}
