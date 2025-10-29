import { useState, useEffect } from 'react';
import { permissionsApi } from '../api-client/permissions.api-client';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to check if the current user has a specific permission
 *
 * Usage:
 * const { hasPermission, loading } = usePermissions();
 * if (hasPermission('edit_user')) {
 *   // Show edit button
 * }
 */
export function usePermissions() {
  const { user, profile } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    fetchPermissions();
  }, [user, profile]);

  const fetchPermissions = async () => {
    if (!user) return;

    try {
      // If user is admin, they have all permissions
      if (profile?.role === 'admin') {
        // Admins have all permissions - just set a wildcard
        setPermissions(new Set(['*'])); // Wildcard means all permissions
        setLoading(false);
        return;
      }

      // Get effective permissions for user
      const response = await permissionsApi.getEffective(user.id, profile?.role || 'user');
      const effectivePerms = response.data;

      // Build permission set
      const permSet = new Set<string>();

      if (Array.isArray(effectivePerms)) {
        effectivePerms.forEach((perm: any) => {
          if (perm.name) {
            permSet.add(perm.name);
          }
        });
      }

      setPermissions(permSet);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setLoading(false);
    }
  };

  const hasPermission = (permissionName: string): boolean => {
    // Admins have all permissions
    if (permissions.has('*')) return true;
    return permissions.has(permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    if (permissions.has('*')) return true;
    return permissionNames.some(name => permissions.has(name));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    if (permissions.has('*')) return true;
    return permissionNames.every(name => permissions.has(name));
  };

  return {
    permissions: Array.from(permissions),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading,
    isAdmin: profile?.role === 'admin',
  };
}

/**
 * Hook to get all available permissions (for admin permission management UI)
 */
export function useAllPermissions() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPermissions();
  }, []);

  const fetchAllPermissions = async () => {
    try {
      const response = await permissionsApi.getAll();
      setPermissions(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching all permissions:', error);
      setLoading(false);
    }
  };

  return { permissions, loading, refresh: fetchAllPermissions };
}

/**
 * Hook to check permission via API (server-side check)
 * Use this for critical operations where you need server validation
 */
export async function checkPermissionServerSide(
  userId: string,
  permissionName: string
): Promise<boolean> {
  try {
    // This would need a specific endpoint on the backend
    // For now, use the effective permissions endpoint
    const response = await permissionsApi.getUserOverrides(userId);
    const userPerms = response.data;

    return Array.isArray(userPerms) && userPerms.some((p: any) => p.name === permissionName);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}
