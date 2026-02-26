import axios from '@/lib/axios';
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
  BannerAnalyticsFilter,
  SendBannerReportRequest,
} from '@newmeca/shared';
import { uploadFile } from './uploads.api-client';

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

/**
 * Upload a banner image through the backend
 * Returns the public URL of the uploaded image
 */
export async function uploadBannerImage(file: File): Promise<string> {
  const result = await uploadFile(file, 'banner-images');
  return result.publicUrl;
}

/**
 * Delete a banner image via the backend
 */
export async function deleteBannerImage(imageUrl: string): Promise<void> {
  const match = imageUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return;

  try {
    await axios.delete('/api/uploads', {
      data: { bucket: match[1], storagePath: match[2] },
    });
  } catch (error: any) {
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

export async function autoDetectBannerSizes(): Promise<{ updated: number; failed: string[] }> {
  const response = await axios.post('/api/admin/banners/auto-detect-sizes');
  return response.data;
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

export async function getFilteredBannersAnalytics(
  filter: BannerAnalyticsFilter
): Promise<BannerAnalytics[]> {
  const params = new URLSearchParams();
  if (filter.startDate) params.append('startDate', filter.startDate);
  if (filter.endDate) params.append('endDate', filter.endDate);
  if (filter.advertiserId) params.append('advertiserId', filter.advertiserId);
  if (filter.size) params.append('size', filter.size);

  const query = params.toString();
  const url = query
    ? `/api/admin/banners/analytics/filtered?${query}`
    : `/api/admin/banners/analytics/filtered`;

  const response = await axios.get(url);
  return response.data;
}

export async function fetchBannerReportHtml(params: {
  advertiserId: string;
  startDate: string;
  endDate: string;
  size?: string;
}): Promise<string> {
  const searchParams = new URLSearchParams();
  searchParams.append('advertiserId', params.advertiserId);
  searchParams.append('startDate', params.startDate);
  searchParams.append('endDate', params.endDate);
  if (params.size) searchParams.append('size', params.size);
  const response = await axios.get(`/api/admin/banners/analytics/report?${searchParams.toString()}`, {
    responseType: 'text',
    headers: { Accept: 'text/html' },
  });
  return response.data;
}

export async function sendBannerReport(
  dto: SendBannerReportRequest
): Promise<{ success: boolean; sentTo: string }> {
  const response = await axios.post('/api/admin/banners/analytics/email-report', dto);
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
  autoDetectBannerSizes,

  // Public
  getActiveBanner,
  recordBannerEngagement,

  // Analytics
  getBannerAnalytics,
  getAllBannersAnalytics,
  getFilteredBannersAnalytics,
  fetchBannerReportHtml,
  sendBannerReport,
};
