import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { permissionsApi, type Permission } from '@/api-client/permissions.api-client';

/**
 * Hook to check if the current user has a specific permission.
 *
 * Loads effective permissions from the backend (role_permissions + user_permission_overrides).
 * Admins/staff get wildcard '*' (all permissions).
 *
 * Usage:
 *   const { hasPermission, isAdmin, loading } = usePermissions();
 *   if (hasPermission('edit_user')) { ... }
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

    let cancelled = false;

    const fetchPermissions = async () => {
      try {
        const isAdmin = profile?.role === 'admin' || profile?.is_staff === true;

        if (isAdmin) {
          // Admins/staff get wildcard
          if (!cancelled) {
            setPermissions(new Set(['*']));
            setLoading(false);
          }
          return;
        }

        // Fetch effective permissions from backend
        const result = await permissionsApi.getMyPermissions();
        if (!cancelled) {
          setPermissions(new Set(result.permissions));
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        if (!cancelled) {
          setPermissions(new Set());
          setLoading(false);
        }
      }
    };

    fetchPermissions();

    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  const hasPermission = (permissionName: string): boolean => {
    if (permissions.has('*')) return true;
    return permissions.has(permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    if (permissions.has('*')) return true;
    return permissionNames.some((name) => permissions.has(name));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    if (permissions.has('*')) return true;
    return permissionNames.every((name) => permissions.has(name));
  };

  return {
    permissions: Array.from(permissions),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading,
    isAdmin: profile?.role === 'admin' || profile?.is_staff === true,
  };
}

/**
 * Hook to get all available permissions (for admin permission management UI).
 * Fetches from the backend API.
 */
export function useAllPermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPermissions();
  }, []);

  const fetchAllPermissions = async () => {
    try {
      setLoading(true);
      const data = await permissionsApi.getAll();
      setPermissions(data);
    } catch (error) {
      console.error('Error fetching all permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  return { permissions, loading, refresh: fetchAllPermissions };
}
