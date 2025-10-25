import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const bannersApi = {
  getAll: (type?: string) => axios.get(`${API_URL}/api/banners`, { params: { type } }),
  getById: (id: string) => axios.get(`${API_URL}/api/banners/${id}`),
  getUserBanners: (userId: string) => axios.get(`${API_URL}/api/banners/user/${userId}`),
  create: (data: any) => axios.post(`${API_URL}/api/banners`, data),
  update: (id: string, data: any) => axios.put(`${API_URL}/api/banners/${id}`, data),
  delete: (id: string) => axios.delete(`${API_URL}/api/banners/${id}`),
  trackImpression: (id: string) => axios.post(`${API_URL}/api/banners/${id}/impression`),
  trackClick: (id: string) => axios.post(`${API_URL}/api/banners/${id}/click`),
};

export const manufacturerAdsApi = {
  getAll: (placement?: string) => axios.get(`${API_URL}/api/manufacturer-ads`, { params: { placement } }),
  getById: (id: string) => axios.get(`${API_URL}/api/manufacturer-ads/${id}`),
  getManufacturerAds: (manufacturerId: string) => axios.get(`${API_URL}/api/manufacturer-ads/manufacturer/${manufacturerId}`),
  create: (data: any) => axios.post(`${API_URL}/api/manufacturer-ads`, data),
  update: (id: string, data: any) => axios.put(`${API_URL}/api/manufacturer-ads/${id}`, data),
  delete: (id: string) => axios.delete(`${API_URL}/api/manufacturer-ads/${id}`),
};
