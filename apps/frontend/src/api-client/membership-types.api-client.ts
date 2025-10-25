import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const membershipTypesApi = {
  getAll: () => axios.get(`${API_URL}/api/membership-types`),
  getActive: () => axios.get(`${API_URL}/api/membership-types/active`),
  getById: (id: string) => axios.get(`${API_URL}/api/membership-types/${id}`),
  create: (data: any) => axios.post(`${API_URL}/api/membership-types`, data),
  update: (id: string, data: any) => axios.put(`${API_URL}/api/membership-types/${id}`, data),
  updateFeatures: (id: string, features: any) => axios.put(`${API_URL}/api/membership-types/${id}/features`, features),
  delete: (id: string) => axios.delete(`${API_URL}/api/membership-types/${id}`),
};
