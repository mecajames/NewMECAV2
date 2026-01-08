import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserCheck, UserX, Star, MapPin, Calendar, Award } from 'lucide-react';
import { getJudge, updateJudge } from '@/judges/judges.api-client';
import { JudgeLevel } from '@newmeca/shared';

const JUDGE_LEVELS = [
  { value: 'in_training', label: 'In Training' },
  { value: 'certified', label: 'Certified' },
  { value: 'head_judge', label: 'Head Judge' },
  { value: 'master_judge', label: 'Master Judge' },
];

export default function JudgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [judge, setJudge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    level: '',
    is_active: true,
    admin_notes: '',
    bio: '',
  });

  useEffect(() => {
    if (id) {
      loadJudge();
    }
  }, [id]);

  async function loadJudge() {
    setLoading(true);
    setError(null);
    try {
      const data = await getJudge(id!);
      setJudge(data);
      setFormData({
        level: data.level || '',
        is_active: data.is_active ?? true,
        admin_notes: data.admin_notes || '',
        bio: data.bio || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load judge');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateJudge(id!, {
        level: formData.level as JudgeLevel,
        is_active: formData.is_active,
        admin_notes: formData.admin_notes,
        bio: formData.bio,
      });
      await loadJudge();
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !judge) {
    return (
      <div className="min-h-screen bg-slate-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 text-red-200">
            {error || 'Judge not found'}
          </div>
          <button
            onClick={() => navigate('/admin/judges')}
            className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Judges
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center text-white text-2xl font-bold">
              {(judge.user?.first_name?.[0] || 'J').toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {judge.user?.first_name} {judge.user?.last_name}
              </h1>
              <p className="text-slate-400">{judge.user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {judge.is_active ? (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                <UserCheck className="h-4 w-4" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                <UserX className="h-4 w-4" />
                Inactive
              </span>
            )}
            <button
              onClick={() => navigate('/admin/judges')}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Judges
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Judge Info */}
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Judge Information</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-3 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-500 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm">Level</label>
                  {editMode ? (
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    >
                      {JUDGE_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white capitalize">{judge.level?.replace('_', ' ')}</p>
                  )}
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Specialty</label>
                  <p className="text-white uppercase">{judge.specialty}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Status</label>
                  {editMode ? (
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                      className="w-full mt-1 bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  ) : (
                    <p className={judge.is_active ? 'text-green-400' : 'text-red-400'}>
                      {judge.is_active ? 'Active' : 'Inactive'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Sub-Specialties</label>
                  <p className="text-white">
                    {judge.sub_specialties?.length > 0
                      ? judge.sub_specialties.join(', ')
                      : 'None'}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm">City</label>
                  <p className="text-white">{judge.city}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">State</label>
                  <p className="text-white">{judge.state}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Country</label>
                  <p className="text-white">{judge.country}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Travel Radius</label>
                  <p className="text-white">{judge.travel_radius || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Bio</h2>
              {editMode ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-32"
                  placeholder="Judge bio..."
                />
              ) : (
                <p className="text-slate-300 whitespace-pre-wrap">
                  {judge.bio || <span className="text-slate-500 italic">No bio provided</span>}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Events Judged</span>
                  <span className="text-white font-bold">{judge.total_events_judged || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Average Rating</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    {judge.average_rating?.toFixed(1) || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Ratings</span>
                  <span className="text-white font-bold">{judge.total_ratings || 0}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Approved</span>
                  <span className="text-white">{formatDate(judge.approved_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white">{formatDate(judge.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="text-white">{formatDate(judge.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Admin Notes</h3>
              {editMode ? (
                <textarea
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-32"
                  placeholder="Admin notes..."
                />
              ) : (
                <p className="text-slate-300 whitespace-pre-wrap text-sm">
                  {judge.admin_notes || <span className="text-slate-500 italic">No notes</span>}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
