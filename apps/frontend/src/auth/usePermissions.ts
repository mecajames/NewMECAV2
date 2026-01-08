import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth';

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

      // For non-admin users, just set empty permissions for now
      // The role_permissions and user_permission_overrides tables don't exist yet
      // When the permission system is fully implemented, uncomment the code below
      setPermissions(new Set<string>());
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
    return permissionNames.some(name => permissions.has(name));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
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
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category, name');

      if (error) throw error;

      setPermissions(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching all permissions:', error);
      setLoading(false);
    }
  };

  return { permissions, loading, refresh: fetchAllPermissions };
}

/**
 * Hook to check permission via database function (server-side check)
 * Use this for critical operations where you need server validation
 */
export async function checkPermissionServerSide(permissionName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_user_permission', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_permission_name: permissionName,
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}
