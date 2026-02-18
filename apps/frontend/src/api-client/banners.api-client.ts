import axios from '@/lib/axios';
import { supabase } from '@/lib/supabase';
import type {
  Advertiser,
  CreateAdvertiserDto,
  UpdateAdvertiserDto,
  Banner,
  CreateBannerDto,
  UpdateBannerDto,
  PublicBanner,
  BannerPosition,
  BannerAnalytics,
} from '@newmeca/shared';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

/**
 * Upload a banner image to Supabase storage
 * Returns the public URL of the uploaded image
 */
export async function uploadBannerImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `banners/${fileName}`;

  const { error } = await supabase.storage
    .from('banner-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Return the public URL
  return `${SUPABASE_URL}/storage/v1/object/public/banner-images/${filePath}`;
}

/**
 * Delete a banner image from Supabase storage
 */
export async function deleteBannerImage(imageUrl: string): Promise<void> {
  // Extract the path from the URL
  const match = imageUrl.match(/banner-images\/(.+)$/);
  if (!match) return;

  const filePath = match[1];
  const { error } = await supabase.storage
    .from('banner-images')
    .remove([filePath]);

  if (error) {
    console.error('Failed to delete image:', error.message);
  }
}

// =============================================================================
// ADVERTISERS
// =============================================================================

export async function getAdvertisers(): Promise<Advertiser[]> {
  const response = await axios.get(`/api/admin/advertisers`);
  return response.data;
}

export async function getActiveAdvertisers(): Promise<Advertiser[]> {
  const response = await axios.get(`/api/admin/advertisers/active`);
  return response.data;
}

export async function getAdvertiser(id: string): Promise<Advertiser> {
  const response = await axios.get(`/api/admin/advertisers/${id}`);
  return response.data;
}

export async function createAdvertiser(dto: CreateAdvertiserDto): Promise<Advertiser> {
  const response = await axios.post(`/api/admin/advertisers`, dto);
  return response.data;
}

export async function updateAdvertiser(id: string, dto: UpdateAdvertiserDto): Promise<Advertiser> {
  const response = await axios.put(`/api/admin/advertisers/${id}`, dto);
  return response.data;
}

export async function deleteAdvertiser(id: string): Promise<void> {
  await axios.delete(`/api/admin/advertisers/${id}`);
}

// =============================================================================
// BANNERS
// =============================================================================

export async function getBanners(): Promise<Banner[]> {
  const response = await axios.get(`/api/admin/banners`);
  return response.data;
}

export async function getBanner(id: string): Promise<Banner> {
  const response = await axios.get(`/api/admin/banners/${id}`);
  return response.data;
}

export async function createBanner(dto: CreateBannerDto): Promise<Banner> {
  const response = await axios.post(`/api/admin/banners`, dto);
  return response.data;
}

export async function updateBanner(id: string, dto: UpdateBannerDto): Promise<Banner> {
  const response = await axios.put(`/api/admin/banners/${id}`, dto);
  return response.data;
}

export async function deleteBanner(id: string): Promise<void> {
  await axios.delete(`/api/admin/banners/${id}`);
}

// =============================================================================
// PUBLIC
// =============================================================================

// Cache for all active banners to prevent duplicate requests
const allBannersCache: Map<string, { data: PublicBanner[]; timestamp: number; promise?: Promise<PublicBanner[]> }> = new Map();
const CACHE_TTL = 30000; // 30 seconds cache

/**
 * Get ALL active banners for a position (for rotation across multiple slots)
 */
export async function getAllActiveBanners(position: BannerPosition): Promise<PublicBanner[]> {
  const cacheKey = `all_${position}`;
  const now = Date.now();
  const cached = allBannersCache.get(cacheKey);

  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    if (cached.promise) {
      return cached.promise;
    }
    return cached.data;
  }

  // Create promise for deduplication of concurrent requests
  const fetchPromise = axios.get(`/api/banners/active/${position}/all`)
    .then(response => {
      const data = response.data || [];
      allBannersCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    })
    .catch(error => {
      allBannersCache.delete(cacheKey);
      throw error;
    });

  allBannersCache.set(cacheKey, { data: [], timestamp: now, promise: fetchPromise });
  return fetchPromise;
}

/**
 * Get a single active banner (uses weighted random selection on backend)
 */
export async function getActiveBanner(position: BannerPosition): Promise<PublicBanner | null> {
  const response = await axios.get(`/api/banners/active/${position}`);
  return response.data;
}

export async function recordBannerEngagement(
  bannerId: string,
  type: 'impression' | 'click'
): Promise<void> {
  await axios.post(`/api/banners/engagement`, { bannerId, type });
}

// =============================================================================
// ANALYTICS
// =============================================================================

export async function getBannerAnalytics(
  id: string,
  startDate?: Date,
  endDate?: Date
): Promise<BannerAnalytics> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());

  const url = params.toString()
    ? `/api/admin/banners/${id}/analytics?${params.toString()}`
    : `/api/admin/banners/${id}/analytics`;

  const response = await axios.get(url);
  return response.data;
}

export async function getAllBannersAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<BannerAnalytics[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());

  const url = params.toString()
    ? `/api/admin/banners/analytics/all?${params.toString()}`
    : `/api/admin/banners/analytics/all`;

  const response = await axios.get(url);
  return response.data;
}

// Export as object for consistent API pattern
export const bannersApi = {
  // Image Upload
  uploadBannerImage,
  deleteBannerImage,

  // Advertisers
  getAdvertisers,
  getActiveAdvertisers,
  getAdvertiser,
  createAdvertiser,
  updateAdvertiser,
  deleteAdvertiser,

  // Banners
  getBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,

  // Public
  getActiveBanner,
  recordBannerEngagement,

  // Analytics
  getBannerAnalytics,
  getAllBannersAnalytics,
};
