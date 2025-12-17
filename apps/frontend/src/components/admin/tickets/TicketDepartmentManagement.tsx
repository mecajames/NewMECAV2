import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
  Eye,
  EyeOff,
  Star,
} from 'lucide-react';
import * as ticketAdminApi from '../../../api-client/ticket-admin.api-client';
import { TicketDepartmentResponse } from '@newmeca/shared';

export function TicketDepartmentManagement() {
  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_private: false,
    is_default: false,
    display_order: 0,
    is_active: true,
  });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await ticketAdminApi.listDepartments(showInactive);
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [showInactive]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  const handleCreate = async () => {
    try {
      await ticketAdminApi.createDepartment({
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || undefined,
        is_private: formData.is_private,
        is_default: formData.is_default,
        display_order: formData.display_order,
      });
      setShowCreateForm(false);
      resetForm();
      fetchDepartments();
    } catch (err) {
      console.error('Failed to create department:', err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await ticketAdminApi.updateDepartment(id, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        is_private: formData.is_private,
        is_default: formData.is_default,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });
      setEditingId(null);
      resetForm();
      fetchDepartments();
    } catch (err) {
      console.error('Failed to update department:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await ticketAdminApi.deleteDepartment(id);
      fetchDepartments();
    } catch (err) {
      console.error('Failed to delete department:', err);
    }
  };

  const startEdit = (dept: TicketDepartmentResponse) => {
    setEditingId(dept.id);
    setFormData({
      name: dept.name,
      slug: dept.slug,
      description: dept.description || '',
      is_private: dept.is_private,
      is_default: dept.is_default,
      display_order: dept.display_order,
      is_active: dept.is_active,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      is_private: false,
      is_default: false,
      display_order: 0,
      is_active: true,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreateForm(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Building2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Departments</h2>
            <p className="text-sm text-gray-400">Configure ticket departments</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
            />
            Show Inactive
          </label>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-white font-medium mb-4">New Department</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  });
                }}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Department name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="department_slug"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                  className="rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                />
                Private
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                />
                Default
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!formData.name}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>
      )}

      {/* Departments List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No departments found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Flags</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {departments.map((dept) => (
                <tr key={dept.id} className={`${!dept.is_active ? 'opacity-50' : ''}`}>
                  {editingId === dept.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={formData.display_order}
                          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-300">Active</span>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-xs text-gray-400">
                            <input
                              type="checkbox"
                              checked={formData.is_private}
                              onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                              className="rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                            />
                            Private
                          </label>
                          <label className="flex items-center gap-1 text-xs text-gray-400">
                            <input
                              type="checkbox"
                              checked={formData.is_default}
                              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                              className="rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                            />
                            Default
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdate(dept.id)}
                            className="p-2 text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-400">
                          <GripVertical className="w-4 h-4" />
                          <span>{dept.display_order}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{dept.name}</span>
                        {dept.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{dept.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-sm text-purple-400 bg-slate-900 px-2 py-1 rounded">{dept.slug}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          dept.is_active
                            ? 'bg-green-500/10 text-green-400 border border-green-500'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500'
                        }`}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {dept.is_private && (
                            <span className="flex items-center gap-1 text-xs text-gray-400" title="Private">
                              <EyeOff className="w-3 h-3" />
                            </span>
                          )}
                          {!dept.is_private && (
                            <span className="flex items-center gap-1 text-xs text-gray-400" title="Public">
                              <Eye className="w-3 h-3" />
                            </span>
                          )}
                          {dept.is_default && (
                            <span className="flex items-center gap-1 text-xs text-yellow-400" title="Default">
                              <Star className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(dept)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default TicketDepartmentManagement;
