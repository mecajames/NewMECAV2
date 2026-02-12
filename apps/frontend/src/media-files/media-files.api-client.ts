import axios from '@/lib/axios';

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
      ? `/api/media-files?fileType=${fileType}`
      : '/api/media-files';
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
    const response = await axios.get(`/api/media-files/search?${params}`);
    return response.data;
  },

  getMediaFile: async (id: string): Promise<MediaFile> => {
    const response = await axios.get(`/api/media-files/${id}`);
    return response.data;
  },

  createMediaFile: async (data: Partial<MediaFile>): Promise<MediaFile> => {
    const response = await axios.post('/api/media-files', data);
    return response.data;
  },

  updateMediaFile: async (id: string, data: Partial<MediaFile>): Promise<MediaFile> => {
    const response = await axios.put(`/api/media-files/${id}`, data);
    return response.data;
  },

  deleteMediaFile: async (id: string): Promise<void> => {
    await axios.delete(`/api/media-files/${id}`);
  },
};
