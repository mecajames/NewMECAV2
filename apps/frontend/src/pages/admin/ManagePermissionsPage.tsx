import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { permissionsApi } from '../../api-client/permissions.api-client';
import { usePermissions } from '../../hooks/usePermissions';

export default function ManagePermissionsPage() {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionsLoading, isAdmin } = usePermissions();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'users',
  });

  const categories = ['users', 'events', 'competition', 'content', 'financial', 'communication', 'system'];

  useEffect(() => {
    // Wait for permissions to load before checking access
    if (permissionsLoading) return;

    // Allow admins or users with specific permission
    if (!isAdmin && !hasPermission('manage_permissions')) {
      window.location.href = '/admin';
      return;
    }
    loadPermissions();
  }, [permissionsLoading, isAdmin, hasPermission]);

  const loadPermissions = async () => {
    try {
      const response = await permissionsApi.getAll();
      setPermissions(response.data);

      // Load role-permission mappings
      await loadRolePermissions();
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async () => {
    try {
      const roles = ['user', 'event_director', 'retailer', 'admin', 'system_admin'];
      const rolePermsData: Record<string, string[]> = {};

      for (const role of roles) {
        const response = await permissionsApi.getRolePermissions(role);
        rolePermsData[role] = response.data.map((p: any) => p.name);
      }

      setRolePermissions(rolePermsData);
    } catch (error) {
      console.error('Failed to load role permissions:', error);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      category: 'users',
    });
    setCreating(true);
  };

  const handleEdit = (permission: any) => {
    setFormData(permission);
    setEditing(permission.id);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await permissionsApi.update(editing, formData);
      } else {
        await permissionsApi.create(formData);
      }
      loadPermissions();
      setEditing(null);
      setCreating(false);
    } catch (error) {
      console.error('Failed to save permission:', error);
      alert('Failed to save permission');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return;

    try {
      await permissionsApi.delete(id);
      loadPermissions();
    } catch (error) {
      console.error('Failed to delete permission:', error);
      alert('Failed to delete permission');
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setCreating(false);
  };

  const filteredPermissions = selectedCategory === 'all'
    ? permissions
    : permissions.filter(p => p.category === selectedCategory);

  const groupedPermissions = filteredPermissions.reduce((acc: any, perm: any) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="text-center py-20">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Permissions Management</h1>
            <p className="text-gray-400">Manage system permissions and access control</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create New Permission
          </button>
        </div>

        {(creating || editing) && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editing ? 'Edit Permission' : 'Create New Permission'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Permission Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g. view_users, create_event"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <p className="text-sm text-gray-400 mt-1">
                  Use lowercase with underscores (e.g., manage_events)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={2}
                  placeholder="What does this permission allow?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
              >
                Save Permission
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {Object.entries(groupedPermissions).map(([category, perms]: [string, any]) => (
            <div key={category} className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4 capitalize flex items-center gap-2">
                <Shield className="h-6 w-6 text-orange-500" />
                {category}
              </h2>
              <div className="space-y-3">
                {perms.map((perm: any) => (
                  <div key={perm.id} className="p-4 bg-slate-700 hover:bg-slate-650 rounded-lg transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-mono text-sm bg-slate-600 text-orange-400 px-3 py-1 rounded">{perm.name}</span>
                        <p className="text-sm text-gray-400 mt-2">{perm.description}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(rolePermissions).map(([role, perms]: [string, any]) => (
                            perms.includes(perm.name) && (
                              <span
                                key={role}
                                className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs font-medium capitalize"
                              >
                                {role.replace('_', ' ')}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(perm)}
                          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(perm.id)}
                          className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-slate-800 border border-orange-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Permission System Information
          </h3>
          <ul className="text-sm space-y-2 text-gray-300">
            <li>• Permissions can be assigned to roles (admin, event_director, etc.)</li>
            <li>• Individual users can have permission overrides (grant or revoke specific permissions)</li>
            <li>• System admin role automatically has ALL permissions</li>
            <li>• New permissions can be created for future features without code changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
