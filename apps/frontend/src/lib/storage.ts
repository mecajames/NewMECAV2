/**
 * Storage URL Utility
 *
 * This utility handles constructing storage URLs from relative paths.
 * It uses environment variables so the same code works in development and production.
 *
 * Development: VITE_SUPABASE_URL=http://127.0.0.1:54321
 * Production:  VITE_SUPABASE_URL=https://your-supabase-project.supabase.co (or AWS S3 URL)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

/**
 * Converts a storage path to a full public URL
 *
 * @param path - Can be:
 *   - Full URL (returned as-is if external, or converted if old Supabase URL)
 *   - Relative path like "documents/media/image.jpg"
 *   - Path starting with "/" (treated as static asset)
 * @param bucket - Optional bucket name (default: extracted from path or 'documents')
 * @returns Full public URL to the storage object
 *
 * @example
 * // Relative path
 * getStorageUrl('documents/media/image.jpg')
 * // Returns: http://127.0.0.1:54321/storage/v1/object/public/documents/media/image.jpg
 *
 * @example
 * // Already a full URL (external)
 * getStorageUrl('https://images.pexels.com/photo.jpg')
 * // Returns: https://images.pexels.com/photo.jpg (unchanged)
 */
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }

  // If it's a static asset (starts with /), return as-is
  if (path.startsWith('/')) {
    return path;
  }

  // If it's already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Check if it's pointing to an old/different Supabase instance
    // and convert it to use current environment's URL
    const supabaseStoragePattern = /https?:\/\/[^/]+\/storage\/v1\/object\/public\/(.+)/;
    const match = path.match(supabaseStoragePattern);

    if (match) {
      // Extract the path after /storage/v1/object/public/
      const relativePath = match[1];
      return `${SUPABASE_URL}/storage/v1/object/public/${relativePath}`;
    }

    // It's an external URL (like Pexels), return as-is
    return path;
  }

  // It's a relative path, construct full URL
  // Handle paths that might already include "storage/v1/object/public/"
  if (path.includes('storage/v1/object/public/')) {
    return `${SUPABASE_URL}/${path}`;
  }

  // Standard relative path - prepend full storage URL
  return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
}

/**
 * Extracts the relative storage path from a full URL
 * Useful for storing paths in the database
 *
 * @param url - Full storage URL
 * @returns Relative path (e.g., "documents/media/image.jpg")
 */
export function getRelativeStoragePath(url: string): string {
  if (!url) {
    return '';
  }

  // If it's already relative, return as-is
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }

  // Extract path from Supabase storage URL
  const supabaseStoragePattern = /https?:\/\/[^/]+\/storage\/v1\/object\/public\/(.+)/;
  const match = url.match(supabaseStoragePattern);

  if (match) {
    return match[1];
  }

  // Return original if not a Supabase URL (external URL)
  return url;
}

/**
 * Check if a URL is an external URL (not from our storage)
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  // Check if it's NOT a Supabase storage URL
  return !url.includes('/storage/v1/object/public/');
}

/**
 * Get the current storage base URL (useful for debugging)
 */
export function getStorageBaseUrl(): string {
  return `${SUPABASE_URL}/storage/v1/object/public`;
}
