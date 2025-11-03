const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type MediaType = 'image' | 'video' | 'pdf' | 'document' | 'other';

export interface MediaFile {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: MediaType;
  fileSize: number;
  mimeType: string;
  dimensions?: string;
  isExternal: boolean;
  tags?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const mediaFilesApi = {
  getAllMediaFiles: async (fileType?: MediaType): Promise<MediaFile[]> => {
    const url = fileType
      ? `${API_BASE_URL}/api/media-files?fileType=${fileType}`
      : `${API_BASE_URL}/api/media-files`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch media files');
    return response.json();
  },

  // Alias for getAllMediaFiles for convenience
  getByType: async (fileType: MediaType): Promise<MediaFile[]> => {
    return mediaFilesApi.getAllMediaFiles(fileType);
  },

  searchMediaFiles: async (searchTerm: string, fileType?: MediaType): Promise<MediaFile[]> => {
    const params = new URLSearchParams({ q: searchTerm });
    if (fileType) params.append('fileType', fileType);
    const response = await fetch(`${API_BASE_URL}/api/media-files/search?${params}`);
    if (!response.ok) throw new Error('Failed to search media files');
    return response.json();
  },

  getMediaFile: async (id: string): Promise<MediaFile> => {
    const response = await fetch(`${API_BASE_URL}/api/media-files/${id}`);
    if (!response.ok) throw new Error('Failed to fetch media file');
    return response.json();
  },

  createMediaFile: async (data: Partial<MediaFile>): Promise<MediaFile> => {
    const response = await fetch(`${API_BASE_URL}/api/media-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create media file');
    return response.json();
  },

  updateMediaFile: async (id: string, data: Partial<MediaFile>): Promise<MediaFile> => {
    const response = await fetch(`${API_BASE_URL}/api/media-files/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update media file');
    return response.json();
  },

  deleteMediaFile: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/media-files/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete media file');
  },
};
