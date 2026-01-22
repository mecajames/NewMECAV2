import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2, Mail, Phone, Globe, X } from 'lucide-react';
import type { Advertiser, CreateAdvertiserDto, UpdateAdvertiserDto } from '@newmeca/shared';
import {
  getAdvertisers,
  createAdvertiser,
  updateAdvertiser,
  deleteAdvertiser,
} from '../../api-client/banners.api-client';

interface FormData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  notes: string;
  isActive: boolean;
}

const initialFormData: FormData = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  website: '',
  notes: '',
  isActive: true,
};

export default function AdvertisersAdminPage() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAdvertiser, setEditingAdvertiser] = useState<Advertiser | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadAdvertisers();
  }, []);

  const loadAdvertisers = async () => {
    try {
      setLoading(true);
      const data = await getAdvertisers();
      setAdvertisers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load advertisers');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAdvertiser(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (advertiser: Advertiser) => {
    setEditingAdvertiser(advertiser);
    setFormData({
      companyName: advertiser.companyName,
      contactName: advertiser.contactName,
      contactEmail: advertiser.contactEmail,
      contactPhone: advertiser.contactPhone || '',
      website: advertiser.website || '',
      notes: advertiser.notes || '',
      isActive: advertiser.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingAdvertiser) {
        const dto: UpdateAdvertiserDto = {
          companyName: formData.companyName,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone || undefined,
          website: formData.website || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        };
        await updateAdvertiser(editingAdvertiser.id, dto);
      } else {
        const dto: CreateAdvertiserDto = {
          companyName: formData.companyName,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone || undefined,
          website: formData.website || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        };
        await createAdvertiser(dto);
      }

      setShowModal(false);
      loadAdvertisers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save advertiser');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdvertiser(id);
      setDeleteConfirm(null);
      loadAdvertisers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete advertiser');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Building2 className="h-8 w-8 text-orange-500" />
              Advertisers
            </h1>
            <p className="text-slate-400 mt-2">Manage banner advertisers</p>
          </div>
          <button
            onClick={openCreateModal}
            className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Advertiser
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Advertisers Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Company</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Contact</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Email</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Status</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {advertisers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No advertisers found. Create your first advertiser to get started.
                    </td>
                  </tr>
                ) : (
                  advertisers.map((advertiser) => (
                    <tr key={advertiser.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{advertiser.companyName}</p>
                            {advertiser.website && (
                              <a
                                href={advertiser.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-slate-400 hover:text-orange-500 flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                                {advertiser.website.replace(/^https?:\/\//, '')}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white">{advertiser.contactName}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="h-4 w-4" />
                          {advertiser.contactEmail}
                        </div>
                        {advertiser.contactPhone && (
                          <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                            <Phone className="h-3 w-3" />
                            {advertiser.contactPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            advertiser.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {advertiser.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(advertiser)}
                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(advertiser.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">
                {editingAdvertiser ? 'Edit Advertiser' : 'Add Advertiser'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-700"
                />
                <label htmlFor="isActive" className="text-sm text-slate-300">
                  Active (can be assigned to banners)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAdvertiser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Delete Advertiser?</h3>
            <p className="text-slate-300 mb-6">
              This will permanently delete the advertiser and all associated banners. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
