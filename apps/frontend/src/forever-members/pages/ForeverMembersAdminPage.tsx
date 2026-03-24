import { useState, useEffect, useCallback } from 'react';
import { Flame, Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Image as ImageIcon } from 'lucide-react';
import { foreverMembersApi, ForeverMember } from '../forever-members.api-client';
import { getStorageUrl } from '@/lib/storage';
import axios from '@/lib/axios';

const emptyForm = {
  meca_id: '',
  full_name: '',
  photo_url: '',
  bio: '',
  quote: '',
  date_of_birth: '',
  date_of_passing: '',
  member_since: '',
  display_order: 0,
  is_published: false,
};

export default function ForeverMembersAdminPage() {
  const [members, setMembers] = useState<ForeverMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // member id or 'new'
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await foreverMembersApi.getAllAdmin();
      setMembers(data);
    } catch (err) {
      console.error('Failed to load forever members', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const startNew = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const startEdit = (m: ForeverMember) => {
    setForm({
      meca_id: m.meca_id || '',
      full_name: m.full_name || '',
      photo_url: m.photo_url || '',
      bio: m.bio || '',
      quote: m.quote || '',
      date_of_birth: m.date_of_birth ? m.date_of_birth.split('T')[0] : '',
      date_of_passing: m.date_of_passing ? m.date_of_passing.split('T')[0] : '',
      member_since: m.member_since ? m.member_since.split('T')[0] : '',
      display_order: m.display_order || 0,
      is_published: m.is_published || false,
    });
    setEditing(m.id);
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.meca_id) {
      alert('Name and MECA ID are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        mecaId: form.meca_id,
        fullName: form.full_name,
        photoUrl: form.photo_url || null,
        bio: form.bio || null,
        quote: form.quote || null,
        dateOfBirth: form.date_of_birth || null,
        dateOfPassing: form.date_of_passing || null,
        memberSince: form.member_since || null,
        displayOrder: form.display_order,
        isPublished: form.is_published,
      };

      if (editing === 'new') {
        await foreverMembersApi.create(payload);
      } else {
        await foreverMembersApi.update(editing!, payload);
      }
      setEditing(null);
      setForm(emptyForm);
      await fetchMembers();
    } catch (err: any) {
      alert('Error saving: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from Forever Members?`)) return;
    try {
      await foreverMembersApi.delete(id);
      await fetchMembers();
    } catch (err: any) {
      alert('Error deleting: ' + err.message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('destination', 'forever-member-images');
      const response = await axios.post('/api/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(prev => ({ ...prev, photo_url: response.data.publicUrl }));
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Flame className="h-7 w-7 text-amber-500" />
          <h1 className="text-2xl font-bold text-white">Forever Members</h1>
        </div>
        {!editing && (
          <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors">
            <Plus className="h-4 w-4" /> Add Member
          </button>
        )}
      </div>

      {/* Edit/Create Form */}
      {editing && (
        <div className="bg-slate-800 border border-amber-900/30 rounded-xl p-6 mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-amber-400">
            {editing === 'new' ? 'Add Forever Member' : 'Edit Forever Member'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
              <input
                type="text" value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">MECA ID *</label>
              <input
                type="text" value={form.meca_id}
                onChange={e => setForm({ ...form, meca_id: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="This ID will be permanently retired"
              />
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Photo</label>
            <div className="flex items-center gap-4">
              {form.photo_url && (
                <img src={getStorageUrl(form.photo_url)} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
              )}
              <div className="flex-1 flex gap-2">
                <input
                  type="text" value={form.photo_url}
                  onChange={e => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="Image URL or upload"
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date of Passing</label>
              <input type="date" value={form.date_of_passing} onChange={e => setForm({ ...form, date_of_passing: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Member Since</label>
              <input type="date" value={form.member_since} onChange={e => setForm({ ...form, member_since: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Biography / Tribute</label>
            <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={5}
              placeholder="Share their story, achievements, and what they meant to the MECA community..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          {/* Quote */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Memorial Quote (optional)</label>
            <input type="text" value={form.quote} onChange={e => setForm({ ...form, quote: e.target.value })}
              placeholder="A favorite saying or tribute message..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          {/* Display Order & Publish */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Order</label>
              <input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-500 text-amber-500 focus:ring-amber-500 bg-slate-700" />
                <span className="text-white">Published (visible to public)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={cancelEdit} className="flex items-center gap-2 px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {members.length === 0 && !editing && (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl">
            <Flame className="h-10 w-10 text-amber-600/30 mx-auto mb-3" />
            <p className="text-gray-500">No forever members added yet.</p>
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center gap-4">
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
              {m.photo_url ? (
                <img src={getStorageUrl(m.photo_url)} alt={m.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Flame className="h-6 w-6 text-amber-600/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium truncate">{m.full_name}</h3>
                {m.is_published ? (
                  <Eye className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-amber-600/60 font-mono">MECA ID #{m.meca_id}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => startEdit(m)} className="p-2 text-gray-400 hover:text-white transition-colors">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(m.id, m.full_name)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
