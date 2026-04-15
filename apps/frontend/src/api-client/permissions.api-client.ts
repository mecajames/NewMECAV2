import axios from '@/lib/axios';


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
  getRoles: () => axios.get<Role[]>(`/api/permissions/roles`).then((r) => r.data),
  createRole: (data: { name: string; displayName: string; description?: string }) =>
    axios.post<Role>(`/api/permissions/roles`, data).then((r) => r.data),
  updateRole: (id: string, data: { displayName?: string; description?: string }) =>
    axios.put<Role>(`/api/permissions/roles/${id}`, data).then((r) => r.data),
  deleteRole: (id: string) => axios.delete(`/api/permissions/roles/${id}`),

  // Permissions CRUD
  getAll: () => axios.get<Permission[]>(`/api/permissions`).then((r) => r.data),
  getByCategory: (category: string) =>
    axios.get<Permission[]>(`/api/permissions/category/${category}`).then((r) => r.data),
  getById: (id: string) =>
    axios.get<Permission>(`/api/permissions/${id}`).then((r) => r.data),
  create: (data: Partial<Permission>) =>
    axios.post<Permission>(`/api/permissions`, data).then((r) => r.data),
  update: (id: string, data: Partial<Permission>) =>
    axios.put<Permission>(`/api/permissions/${id}`, data).then((r) => r.data),
  delete: (id: string) => axios.delete(`/api/permissions/${id}`),

  // Role permissions
  getAllRolePermissions: () =>
    axios.get<RolePermission[]>(`/api/permissions/roles/all`).then((r) => r.data),
  getRolePermissions: (role: string) =>
    axios.get<RolePermission[]>(`/api/permissions/role/${role}`).then((r) => r.data),
  assignToRole: (role: string, permissionId: string) =>
    axios.post<RolePermission>(`/api/permissions/role/${role}/assign`, { permissionId }).then((r) => r.data),
  removeFromRole: (role: string, permissionId: string) =>
    axios.delete(`/api/permissions/role/${role}/remove/${permissionId}`),

  // User overrides
  getUserOverrides: (userId: string) =>
    axios.get<UserPermissionOverride[]>(`/api/permissions/user/${userId}`).then((r) => r.data),
  getEffective: (userId: string) =>
    axios.get<EffectivePermissions>(`/api/permissions/user/${userId}/effective`).then((r) => r.data),
  grantToUser: (userId: string, permissionId: string) =>
    axios.post<UserPermissionOverride>(`/api/permissions/user/${userId}/grant`, { permissionId }).then((r) => r.data),
  revokeFromUser: (userId: string, permissionId: string) =>
    axios.post<UserPermissionOverride>(`/api/permissions/user/${userId}/revoke`, { permissionId }).then((r) => r.data),
  removeOverride: (userId: string, permissionId: string) =>
    axios.delete(`/api/permissions/user/${userId}/override/${permissionId}`),

  // Current user
  getMyPermissions: () =>
    axios.get<EffectivePermissions>(`/api/permissions/me/effective`).then((r) => r.data),
};
