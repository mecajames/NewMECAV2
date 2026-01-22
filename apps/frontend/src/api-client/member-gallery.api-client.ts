const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/member-gallery/${memberId}`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error('Failed to fetch gallery');
    }
    return response.json();
  },

  // ============================================
  // AUTHENTICATED USER ENDPOINTS (Own Gallery)
  // ============================================

  /**
   * Get current user's gallery (including private images)
   */
  getMyGallery: async (authToken: string): Promise<GalleryImage[]> => {
    const response = await fetch(`${API_BASE_URL}/api/member-gallery/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch your gallery');
    return response.json();
  },

  /**
   * Add an image to current user's gallery
   */
  addImage: async (data: CreateGalleryImageDto, authToken: string): Promise<GalleryImage> => {
    const response = await fetch(`${API_BASE_URL}/api/member-gallery/me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add image');
    return response.json();
  },

  /**
   * Update an image in current user's gallery
   */
  updateImage: async (
    imageId: string,
    data: UpdateGalleryImageDto,
    authToken: string
  ): Promise<GalleryImage> => {
    const response = await fetch(`${API_BASE_URL}/api/member-gallery/me/${imageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update image');
    return response.json();
  },

  /**
   * Delete an image from current user's gallery
   */
  deleteImage: async (imageId: string, authToken: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/member-gallery/me/${imageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete image');
  },

  /**
   * Reorder images in current user's gallery
   */
  reorderImages: async (imageIds: string[], authToken: string): Promise<GalleryImage[]> => {
    const response = await fetch(`${API_BASE_URL}/api/member-gallery/me/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ imageIds }),
    });
    if (!response.ok) throw new Error('Failed to reorder images');
    return response.json();
  },

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all images for a member (including private) - admin only
   */
  getAllGalleryImages: async (memberId: string, authToken: string): Promise<GalleryImage[]> => {
    const response = await fetch(`${API_BASE_URL}/api/member-gallery/${memberId}/all`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch member gallery');
    return response.json();
  },

  /**
   * Delete any image - admin only
   */
  adminDeleteImage: async (memberId: string, imageId: string, authToken: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/member-gallery/${memberId}/${imageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete image');
  },
};
