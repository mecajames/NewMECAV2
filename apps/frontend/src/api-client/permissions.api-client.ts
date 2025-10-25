import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const permissionsApi = {
  getAll: () => axios.get(`${API_URL}/api/permissions`),
  getByCategory: (category: string) => axios.get(`${API_URL}/api/permissions/category/${category}`),
  getById: (id: string) => axios.get(`${API_URL}/api/permissions/${id}`),
  create: (data: any) => axios.post(`${API_URL}/api/permissions`, data),
  update: (id: string, data: any) => axios.put(`${API_URL}/api/permissions/${id}`, data),
  delete: (id: string) => axios.delete(`${API_URL}/api/permissions/${id}`),

  // Role permissions
  getRolePermissions: (role: string) => axios.get(`${API_URL}/api/permissions/role/${role}`),
  assignToRole: (role: string, permissionId: string) => axios.post(`${API_URL}/api/permissions/role/${role}/assign`, { permissionId }),
  removeFromRole: (role: string, permissionId: string) => axios.delete(`${API_URL}/api/permissions/role/${role}/remove/${permissionId}`),

  // User overrides
  getUserOverrides: (userId: string) => axios.get(`${API_URL}/api/permissions/user/${userId}`),
  getEffective: (userId: string, role: string) => axios.get(`${API_URL}/api/permissions/user/${userId}/effective/${role}`),
  grantToUser: (userId: string, permissionId: string) => axios.post(`${API_URL}/api/permissions/user/${userId}/grant`, { permissionId }),
  revokeFromUser: (userId: string, permissionId: string) => axios.post(`${API_URL}/api/permissions/user/${userId}/revoke`, { permissionId }),
  removeOverride: (userId: string, permissionId: string) => axios.delete(`${API_URL}/api/permissions/user/${userId}/override/${permissionId}`),
};
