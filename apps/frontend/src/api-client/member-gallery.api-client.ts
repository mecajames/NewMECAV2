import axios from '@/lib/axios';

export interface GalleryImage {
  id: string;
  memberId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  displayOrder: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryImageDto {
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  displayOrder?: number;
  isPublic?: boolean;
}

export interface UpdateGalleryImageDto {
  title?: string;
  description?: string;
  displayOrder?: number;
  isPublic?: boolean;
}

export const memberGalleryApi = {
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Get public gallery for a member
   */
  getPublicGallery: async (memberId: string): Promise<GalleryImage[]> => {
    const response = await axios.get(`/api/member-gallery/${memberId}`, {
      validateStatus: (status) => status < 500,
    });
    if (response.status === 404) return [];
    if (response.status >= 400) throw new Error('Failed to fetch gallery');
    return response.data;
  },

  // ============================================
  // AUTHENTICATED USER ENDPOINTS (Own Gallery)
  // ============================================

  /**
   * Get current user's gallery (including private images)
   */
  getMyGallery: async (authToken: string): Promise<GalleryImage[]> => {
    const response = await axios.get(`/api/member-gallery/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  /**
   * Add an image to current user's gallery
   */
  addImage: async (data: CreateGalleryImageDto, authToken: string): Promise<GalleryImage> => {
    const response = await axios.post(`/api/member-gallery/me`, data, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  /**
   * Update an image in current user's gallery
   */
  updateImage: async (
    imageId: string,
    data: UpdateGalleryImageDto,
    authToken: string
  ): Promise<GalleryImage> => {
    const response = await axios.put(`/api/member-gallery/me/${imageId}`, data, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  /**
   * Delete an image from current user's gallery
   */
  deleteImage: async (imageId: string, authToken: string): Promise<void> => {
    await axios.delete(`/api/member-gallery/me/${imageId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  },

  /**
   * Reorder images in current user's gallery
   */
  reorderImages: async (imageIds: string[], authToken: string): Promise<GalleryImage[]> => {
    const response = await axios.put(`/api/member-gallery/me/reorder`, { imageIds }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all images for a member (including private) - admin only
   */
  getAllGalleryImages: async (memberId: string, authToken: string): Promise<GalleryImage[]> => {
    const response = await axios.get(`/api/member-gallery/${memberId}/all`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return response.data;
  },

  /**
   * Delete any image - admin only
   */
  adminDeleteImage: async (memberId: string, imageId: string, authToken: string): Promise<void> => {
    await axios.delete(`/api/member-gallery/${memberId}/${imageId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
  },
};
