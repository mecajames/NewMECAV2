import { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Save, X, Search, Upload, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hallOfFameApi, type HallOfFameInductee, type CreateHallOfFameInducteeDto } from '../hall-of-fame.api-client';
import { uploadFile } from '@/api-client/uploads.api-client';
import { getStorageUrl } from '@/lib/storage';
import ActiveMemberLookup from '@/shared/components/MemberSearchInput';
import type { Profile } from '@/profiles/profiles.api-client';

const DEFAULT_CATEGORIES = ['competitors', 'teams', 'retailers', 'judges'];

const EMPTY_FORM: CreateHallOfFameInducteeDto = {
  category: 'competitors',
  induction_year: new Date().getFullYear(),
  name: '',
  state: '',
  team_affiliation: '',
  location: '',
  bio: '',
  image_url: '',
};

export default function HallOfFameAdminPage() {
  const navigate = useNavigate();
  const [inductees, setInductees] = useState<HallOfFameInductee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<CreateHallOfFameInducteeDto>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lookupMecaId, setLookupMecaId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive all categories from data + defaults
  const allCategories = useMemo(() => {
    const fromData = inductees.map((i) => i.category);
    const merged = new Set([...DEFAULT_CATEGORIES, ...fromData]);
    return [...merged].sort();
  }, [inductees]);

  const loadData = async () => {
    try {
      const data = await hallOfFameApi.getAll();
      setInductees(data);
    } catch {
      setError('Failed to load inductees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = inductees.filter((i) => {
    if (filterCategory && i.category !== filterCategory) return false;
    if (filterYear && i.induction_year !== Number(filterYear)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !i.name.toLowerCase().includes(q) &&
        !(i.state || '').toLowerCase().includes(q) &&
        !(i.location || '').toLowerCase().includes(q) &&
        !(i.team_affiliation || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const years = [...new Set(inductees.map((i) => i.induction_year))].sort((a, b) => b - a);

  const handleMemberSelect = (profile: Profile) => {
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
    setForm((prev) => ({
      ...prev,
      name: fullName,
      state: profile.state || prev.state || '',
    }));
    setLookupMecaId(profile.meca_id || '');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadFile(file, 'media-library', undefined, 'hall-of-fame');
      setForm((prev) => ({ ...prev, image_url: result.publicUrl }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { ...form };
      // Use the new custom category if provided
      if (showNewCategory && newCategory.trim()) {
        payload.category = newCategory.trim().toLowerCase();
      }
      if (editingId) {
        await hallOfFameApi.update(editingId, payload);
        setSuccess(`Updated "${form.name}" successfully.`);
      } else {
        await hallOfFameApi.create(payload);
        setSuccess(`Added "${form.name}" to the Hall of Fame.`);
      }
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
      setShowForm(false);
      setLookupMecaId('');
      setNewCategory('');
      setShowNewCategory(false);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (inductee: HallOfFameInductee) => {
    const isKnownCategory = allCategories.includes(inductee.category);
    setForm({
      category: isKnownCategory ? inductee.category : DEFAULT_CATEGORIES[0],
      induction_year: inductee.induction_year,
      name: inductee.name,
      state: inductee.state || '',
      team_affiliation: inductee.team_affiliation || '',
      location: inductee.location || '',
      bio: inductee.bio || '',
      image_url: inductee.image_url || '',
    });
    if (!isKnownCategory) {
      setShowNewCategory(true);
      setNewCategory(inductee.category);
    } else {
      setShowNewCategory(false);
      setNewCategory('');
    }
    setEditingId(inductee.id);
    setShowForm(true);
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" from the Hall of Fame?`)) return;
    try {
      await hallOfFameApi.delete(id);
      setSuccess(`Deleted "${name}".`);
      await loadData();
    } catch {
      setError('Failed to delete');
    }
  };

  const cancelEdit = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(false);
    setLookupMecaId('');
    setNewCategory('');
    setShowNewCategory(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back to Admin Dashboard */}
        <button
          onClick={() => navigate('/dashboard/admin')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Hall of Fame Management</h1>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); setSuccess(''); setShowNewCategory(false); setNewCategory(''); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Inductee
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Form (shown when Add/Edit clicked) */}
        {showForm && (
          <div className="bg-slate-800/70 border border-slate-700/50 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingId ? 'Edit Inductee' : 'Add New Inductee'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="e.g. manufacturers"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-orange-500 focus:border-orange-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setShowNewCategory(false); setNewCategory(''); }}
                        className="px-2 py-2 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors text-sm"
                        title="Use existing category"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-orange-500 focus:border-orange-500"
                      >
                        {allCategories.map((c) => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewCategory(true)}
                        className="px-2 py-2 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors text-sm"
                        title="Add new category"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Induction Year *</label>
                  <input
                    type="number"
                    value={form.induction_year}
                    onChange={(e) => setForm({ ...form, induction_year: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-orange-500 focus:border-orange-500"
                    min={1900}
                    max={2100}
                    required
                  />
                </div>
              </div>

              {/* Name & MECA ID lookup (type in either to auto-lookup active members) */}
              {!editingId ? (
                <div className="mb-4">
                  <ActiveMemberLookup
                    name={form.name}
                    mecaId={lookupMecaId}
                    onNameChange={(val) => setForm({ ...form, name: val })}
                    onMecaIdChange={setLookupMecaId}
                    onSelect={handleMemberSelect}
                    nameLabel="Name * (type to search active members)"
                    mecaIdLabel="MECA ID (type to search)"
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                  <input
                    type="text"
                    value={form.state || ''}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="e.g. TX, FL"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Team Affiliation</label>
                  <input
                    type="text"
                    value={form.team_affiliation || ''}
                    onChange={(e) => setForm({ ...form, team_affiliation: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location || ''}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="City/State for retailers"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                  <textarea
                    value={form.bio || ''}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Image Upload */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Photo</label>
                  <div className="flex items-start gap-4">
                    {form.image_url ? (
                      <div className="relative group">
                        <img
                          src={getStorageUrl(form.image_url)}
                          alt="Inductee"
                          className="w-20 h-20 rounded-lg object-cover border border-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, image_url: '' })}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors text-sm disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Uploading...' : 'Upload Photo'}
                      </button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WebP. Max 5MB.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-5">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors text-sm"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, state, location..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-500"
            />
          </div>
          <span className="text-gray-400 text-sm ml-auto">
            {filtered.length} inductee{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-gray-400 font-medium px-4 py-3 w-10"></th>
                    <th className="text-left text-gray-400 font-medium px-4 py-3">Name</th>
                    <th className="text-left text-gray-400 font-medium px-4 py-3">Category</th>
                    <th className="text-left text-gray-400 font-medium px-4 py-3">Year</th>
                    <th className="text-left text-gray-400 font-medium px-4 py-3">State</th>
                    <th className="text-left text-gray-400 font-medium px-4 py-3">Location</th>
                    <th className="text-left text-gray-400 font-medium px-4 py-3">Team</th>
                    <th className="text-right text-gray-400 font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inductee) => (
                    <tr key={inductee.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-4 py-2">
                        {inductee.image_url ? (
                          <img
                            src={getStorageUrl(inductee.image_url)}
                            alt={inductee.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-500">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{inductee.name}</td>
                      <td className="px-4 py-3 text-gray-300 capitalize">{inductee.category}</td>
                      <td className="px-4 py-3 text-gray-300">{inductee.induction_year}</td>
                      <td className="px-4 py-3 text-gray-400">{inductee.state || '-'}</td>
                      <td className="px-4 py-3 text-gray-400">{inductee.location || '-'}</td>
                      <td className="px-4 py-3 text-gray-400">{inductee.team_affiliation || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(inductee)}
                            className="p-1.5 rounded bg-slate-700 text-gray-300 hover:text-white hover:bg-slate-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(inductee.id, inductee.name)}
                            className="p-1.5 rounded bg-slate-700 text-gray-300 hover:text-red-400 hover:bg-slate-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                        No inductees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
