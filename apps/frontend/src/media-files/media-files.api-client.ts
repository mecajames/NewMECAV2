import axios from '@/lib/axios';

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
    const response = await axios.get(url);
    return response.data;
  },

  // Alias for getAllMediaFiles for convenience
  getByType: async (fileType: MediaType): Promise<MediaFile[]> => {
    return mediaFilesApi.getAllMediaFiles(fileType);
  },

  searchMediaFiles: async (searchTerm: string, fileType?: MediaType): Promise<MediaFile[]> => {
    const params = new URLSearchParams({ q: searchTerm });
    if (fileType) params.append('fileType', fileType);
    const response = await axios.get(`${API_BASE_URL}/api/media-files/search?${params}`);
    return response.data;
  },

  getMediaFile: async (id: string): Promise<MediaFile> => {
    const response = await axios.get(`${API_BASE_URL}/api/media-files/${id}`);
    return response.data;
  },

  createMediaFile: async (data: Partial<MediaFile>): Promise<MediaFile> => {
    const response = await axios.post(`${API_BASE_URL}/api/media-files`, data);
    return response.data;
  },

  updateMediaFile: async (id: string, data: Partial<MediaFile>): Promise<MediaFile> => {
    const response = await axios.put(`${API_BASE_URL}/api/media-files/${id}`, data);
    return response.data;
  },

  deleteMediaFile: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/media-files/${id}`);
  },
};
