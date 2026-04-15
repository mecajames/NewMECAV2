import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, ArrowLeft, ChevronRight, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { permissionsApi, type Role, type Permission, type RolePermission } from '@/api-client/permissions.api-client';
import { usePermissions } from '@/auth/usePermissions';

const CATEGORIES = ['users', 'events', 'competition', 'content', 'financial', 'communication', 'system'];

interface ManagePermissionsPageProps {
  embedded?: boolean;
}

export default function ManagePermissionsPage({ embedded = false }: ManagePermissionsPageProps) {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionsLoading, isAdmin } = usePermissions();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<'roles' | 'permissions'>('roles');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Role form
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({ name: '', displayName: '', description: '' });

  // Permission form
  const [showPermForm, setShowPermForm] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [permFormData, setPermFormData] = useState({ name: '', description: '', category: 'users' });

  useEffect(() => {
    if (permissionsLoading) return;
    if (!isAdmin && !hasPermission('manage_permissions')) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [permissionsLoading, isAdmin]);

  const loadData = async () => {
    try {
      const [rolesData, perms, rolePerms] = await Promise.all([
        permissionsApi.getRoles(),
        permissionsApi.getAll(),
        permissionsApi.getAllRolePermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(perms);
      setRolePermissions(rolePerms);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRolePermissionIds = (roleName: string): Set<string> => {
    const set = new Set<string>();
    rolePermissions.forEach((rp) => {
      if (rp.role === roleName) set.add(rp.permission.id);
    });
    return set;
  };

  const togglePermissionForRole = async (roleName: string, permissionId: string) => {
    try {
      const assigned = getRolePermissionIds(roleName).has(permissionId);
      if (assigned) {
        await permissionsApi.removeFromRole(roleName, permissionId);
      } else {
        await permissionsApi.assignToRole(roleName, permissionId);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to toggle permission:', error);
    }
  };

  // ── Role CRUD ─────────────────────────────────────────────────

  const handleCreateRole = () => {
    setRoleFormData({ name: '', displayName: '', description: '' });
    setEditingRole(null);
    setShowRoleForm(true);
  };

  const handleEditRole = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoleFormData({ name: role.name, displayName: role.displayName, description: role.description || '' });
    setEditingRole(role);
    setShowRoleForm(true);
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await permissionsApi.updateRole(editingRole.id, {
          displayName: roleFormData.displayName,
          description: roleFormData.description || undefined,
        });
      } else {
        await permissionsApi.createRole({
          name: roleFormData.name,
          displayName: roleFormData.displayName,
          description: roleFormData.description || undefined,
        });
      }
      await loadData();
      setShowRoleForm(false);
      setEditingRole(null);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    if (role.isSystem) {
      alert('Cannot delete system roles.');
      return;
    }
    if (!confirm(`Delete role "${role.displayName}"? All permission assignments for this role will be removed.`)) return;
    try {
      await permissionsApi.deleteRole(role.id);
      await loadData();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete role');
    }
  };

  // ── Permission CRUD ───────────────────────────────────────────

  const handleCreatePerm = () => {
    setPermFormData({ name: '', description: '', category: 'users' });
    setEditingPerm(null);
    setShowPermForm(true);
  };

  const handleEditPerm = (perm: Permission) => {
    setPermFormData({ name: perm.name, description: perm.description || '', category: perm.category });
    setEditingPerm(perm);
    setShowPermForm(true);
  };

  const handleSavePerm = async () => {
    try {
      if (editingPerm) {
        await permissionsApi.update(editingPerm.id, permFormData);
      } else {
        await permissionsApi.create(permFormData);
      }
      await loadData();
      setShowPermForm(false);
      setEditingPerm(null);
    } catch (error) {
      alert('Failed to save permission');
    }
  };

  const handleDeletePerm = async (id: string) => {
    if (!confirm('Delete this permission? It will be removed from all roles.')) return;
    try {
      await permissionsApi.delete(id);
      await loadData();
    } catch (error) {
      alert('Failed to delete permission');
    }
  };

  if (loading) {
    return (
      <div className={embedded ? 'py-12' : 'min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12'}>
        <div className="text-center py-20">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
        </div>
      </div>
    );
  }

  const content = (
    <>
      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setActiveView('roles'); setSelectedRole(null); }}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-colors ${
            activeView === 'roles' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          Roles
        </button>
        <button
          onClick={() => setActiveView('permissions')}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-colors ${
            activeView === 'permissions' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
          }`}
        >
          Permissions
        </button>
      </div>

      {/* ═══════════════════════ ROLES LIST ═══════════════════════ */}
      {activeView === 'roles' && !selectedRole && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400">Select a role to view and manage its permissions.</p>
            <button
              onClick={handleCreateRole}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Role
            </button>
          </div>

          {/* Role Form */}
          {showRoleForm && (
            <div className="bg-slate-800 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role Key</label>
                  <input
                    type="text"
                    disabled={!!editingRole}
                    className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 font-mono"
                    placeholder="e.g. event_coordinator"
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lowercase with underscores. Cannot be changed after creation.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g. Event Coordinator"
                    value={roleFormData.displayName}
                    onChange={(e) => setRoleFormData({ ...roleFormData, displayName: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <input
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="What is this role for?"
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={handleSaveRole} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
                <button onClick={() => { setShowRoleForm(false); setEditingRole(null); }} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const permCount = getRolePermissionIds(role.name).size;
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-orange-500/50 rounded-xl p-5 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        role.name === 'admin' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-gray-300 group-hover:bg-orange-500/20 group-hover:text-orange-400'
                      }`}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{role.displayName}</h3>
                        <p className="text-xs text-gray-500 font-mono">{role.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!role.isSystem && (
                        <>
                          <button
                            onClick={(e) => handleEditRole(role, e)}
                            className="p-1.5 hover:bg-blue-600/10 text-gray-500 hover:text-blue-400 rounded-lg transition-colors"
                            title="Edit role"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteRole(role, e)}
                            className="p-1.5 hover:bg-red-600/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                            title="Delete role"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-orange-400 transition-colors ml-1" />
                    </div>
                  </div>
                  {role.description && <p className="text-xs text-gray-500 mb-2">{role.description}</p>}
                  <p className="text-sm text-gray-400">
                    {role.name === 'admin' ? 'All permissions (implicit)' : `${permCount} permission${permCount !== 1 ? 's' : ''} assigned`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════ ROLE DETAIL ═══════════════════════ */}
      {activeView === 'roles' && selectedRole && (
        <div>
          <button
            onClick={() => setSelectedRole(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all roles
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              selectedRole.name === 'admin' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-white'
            }`}>
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedRole.displayName}</h2>
              <p className="text-gray-400 font-mono text-sm">{selectedRole.name}</p>
            </div>
            {selectedRole.name === 'admin' && (
              <span className="ml-auto px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-semibold">
                All Permissions (Implicit)
              </span>
            )}
          </div>

          {selectedRole.name === 'admin' ? (
            <div className="bg-slate-800 rounded-xl p-6">
              <p className="text-gray-300">
                The Admin role has implicit access to all permissions. This cannot be changed.
                Users with <code className="text-orange-400 bg-slate-700 px-2 py-0.5 rounded">role = admin</code> or{' '}
                <code className="text-orange-400 bg-slate-700 px-2 py-0.5 rounded">is_staff = true</code> get full access.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map((category) => {
                const categoryPerms = permissions.filter((p) => p.category === category);
                if (categoryPerms.length === 0) return null;
                const assignedIds = getRolePermissionIds(selectedRole.name);

                return (
                  <div key={category} className="bg-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 capitalize flex items-center gap-2">
                      <Shield className="h-5 w-5 text-orange-500" />
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryPerms.map((perm) => {
                        const assigned = assignedIds.has(perm.id);
                        return (
                          <div
                            key={perm.id}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                              assigned
                                ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'
                                : 'bg-slate-700/50 border border-slate-600/50 hover:bg-slate-700'
                            }`}
                            onClick={() => togglePermissionForRole(selectedRole.name, perm.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                                assigned ? 'bg-green-600 text-white' : 'bg-slate-600 text-gray-500'
                              }`}>
                                {assigned ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                              </div>
                              <div>
                                <span className="font-mono text-sm text-gray-200">{perm.name}</span>
                                {perm.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ PERMISSIONS VIEW ═══════════════════════ */}
      {activeView === 'permissions' && (
        <>
          <div className="mb-6">
            <button
              onClick={handleCreatePerm}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create New Permission
            </button>
          </div>

          {/* Permission Form */}
          {showPermForm && (
            <div className="bg-slate-800 rounded-xl p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingPerm ? 'Edit Permission' : 'Create New Permission'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Permission Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                    placeholder="e.g. view_users, create_event"
                    value={permFormData.name}
                    onChange={(e) => setPermFormData({ ...permFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={2}
                    placeholder="What does this permission allow?"
                    value={permFormData.description}
                    onChange={(e) => setPermFormData({ ...permFormData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={permFormData.category}
                    onChange={(e) => setPermFormData({ ...permFormData, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={handleSavePerm} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors">
                  Save
                </button>
                <button onClick={() => { setShowPermForm(false); setEditingPerm(null); }} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Permissions list */}
          <div className="space-y-6">
            {CATEGORIES.map((category) => {
              const categoryPerms = permissions.filter((p) => p.category === category);
              if (categoryPerms.length === 0) return null;
              return (
                <div key={category} className="bg-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 capitalize flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-500" />
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryPerms.map((perm) => (
                      <div key={perm.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <span className="font-mono text-sm text-orange-400 bg-slate-600 px-3 py-1 rounded">{perm.name}</span>
                          {perm.description && <p className="text-xs text-gray-500 mt-1.5">{perm.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditPerm(perm)} className="p-2 hover:bg-blue-600/10 text-blue-400 rounded-lg transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeletePerm(perm.id)} className="p-2 hover:bg-red-600/10 text-red-400 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Roles & Permissions</h1>
            <p className="text-gray-400">Manage roles and their associated permissions</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
