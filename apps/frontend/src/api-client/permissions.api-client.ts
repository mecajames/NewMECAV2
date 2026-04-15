import axios from '@/lib/axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  createdAt: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission: Permission;
  createdAt: string;
}

export interface UserPermissionOverride {
  id: string;
  user: string;
  permission: Permission;
  granted: boolean;
  createdAt: string;
}

export interface EffectivePermissions {
  permissions: string[];
  rolePermissions: string[];
  overrides: { name: string; granted: boolean }[];
}

export const permissionsApi = {
  // Permissions CRUD
  // Roles CRUD
  getRoles: () => axios.get<Role[]>(`${API_URL}/api/permissions/roles`).then((r) => r.data),
  createRole: (data: { name: string; displayName: string; description?: string }) =>
    axios.post<Role>(`${API_URL}/api/permissions/roles`, data).then((r) => r.data),
  updateRole: (id: string, data: { displayName?: string; description?: string }) =>
    axios.put<Role>(`${API_URL}/api/permissions/roles/${id}`, data).then((r) => r.data),
  deleteRole: (id: string) => axios.delete(`${API_URL}/api/permissions/roles/${id}`),

  // Permissions CRUD
  getAll: () => axios.get<Permission[]>(`${API_URL}/api/permissions`).then((r) => r.data),
  getByCategory: (category: string) =>
    axios.get<Permission[]>(`${API_URL}/api/permissions/category/${category}`).then((r) => r.data),
  getById: (id: string) =>
    axios.get<Permission>(`${API_URL}/api/permissions/${id}`).then((r) => r.data),
  create: (data: Partial<Permission>) =>
    axios.post<Permission>(`${API_URL}/api/permissions`, data).then((r) => r.data),
  update: (id: string, data: Partial<Permission>) =>
    axios.put<Permission>(`${API_URL}/api/permissions/${id}`, data).then((r) => r.data),
  delete: (id: string) => axios.delete(`${API_URL}/api/permissions/${id}`),

  // Role permissions
  getAllRolePermissions: () =>
    axios.get<RolePermission[]>(`${API_URL}/api/permissions/roles/all`).then((r) => r.data),
  getRolePermissions: (role: string) =>
    axios.get<RolePermission[]>(`${API_URL}/api/permissions/role/${role}`).then((r) => r.data),
  assignToRole: (role: string, permissionId: string) =>
    axios.post<RolePermission>(`${API_URL}/api/permissions/role/${role}/assign`, { permissionId }).then((r) => r.data),
  removeFromRole: (role: string, permissionId: string) =>
    axios.delete(`${API_URL}/api/permissions/role/${role}/remove/${permissionId}`),

  // User overrides
  getUserOverrides: (userId: string) =>
    axios.get<UserPermissionOverride[]>(`${API_URL}/api/permissions/user/${userId}`).then((r) => r.data),
  getEffective: (userId: string) =>
    axios.get<EffectivePermissions>(`${API_URL}/api/permissions/user/${userId}/effective`).then((r) => r.data),
  grantToUser: (userId: string, permissionId: string) =>
    axios.post<UserPermissionOverride>(`${API_URL}/api/permissions/user/${userId}/grant`, { permissionId }).then((r) => r.data),
  revokeFromUser: (userId: string, permissionId: string) =>
    axios.post<UserPermissionOverride>(`${API_URL}/api/permissions/user/${userId}/revoke`, { permissionId }).then((r) => r.data),
  removeOverride: (userId: string, permissionId: string) =>
    axios.delete(`${API_URL}/api/permissions/user/${userId}/override/${permissionId}`),

  // Current user
  getMyPermissions: () =>
    axios.get<EffectivePermissions>(`${API_URL}/api/permissions/me/effective`).then((r) => r.data),
};
