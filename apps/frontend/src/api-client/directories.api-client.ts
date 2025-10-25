import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const directoriesApi = {
  getAll: (type?: string) => axios.get(`${API_URL}/api/directories`, { params: { type } }),
  getFeatured: (type?: string) => axios.get(`${API_URL}/api/directories/featured`, { params: { type } }),
  getById: (id: string) => axios.get(`${API_URL}/api/directories/${id}`),
  getByProfile: (profileId: string) => axios.get(`${API_URL}/api/directories/profile/${profileId}`),
  create: (data: any) => axios.post(`${API_URL}/api/directories`, data),
  update: (id: string, data: any) => axios.put(`${API_URL}/api/directories/${id}`, data),
  setFeatured: (id: string, featured: boolean) => axios.put(`${API_URL}/api/directories/${id}/featured`, { featured }),
  delete: (id: string) => axios.delete(`${API_URL}/api/directories/${id}`),
};
