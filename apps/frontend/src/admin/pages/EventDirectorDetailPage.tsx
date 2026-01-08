import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserCheck, UserX, Star, MapPin, Calendar, Award } from 'lucide-react';
import { getEventDirector, updateEventDirector } from '@/event-directors/event-directors.api-client';

export default function EventDirectorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [eventDirector, setEventDirector] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    is_active: true,
    admin_notes: '',
    bio: '',
  });

  useEffect(() => {
    if (id) {
      loadEventDirector();
    }
  }, [id]);

  async function loadEventDirector() {
    setLoading(true);
    setError(null);
    try {
      const data = await getEventDirector(id!);
      setEventDirector(data);
      setFormData({
        is_active: data.is_active ?? true,
        admin_notes: data.admin_notes || '',
        bio: data.bio || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load event director');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateEventDirector(id!, {
        is_active: formData.is_active,
        admin_notes: formData.admin_notes,
        bio: formData.bio,
      });
      await loadEventDirector();
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

  if (error || !eventDirector) {
    return (
      <div className="min-h-screen bg-slate-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 text-red-200">
            {error || 'Event Director not found'}
          </div>
          <button
            onClick={() => navigate('/admin/event-directors')}
            className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event Directors
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
              {(eventDirector.user?.first_name?.[0] || 'E').toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {eventDirector.user?.first_name} {eventDirector.user?.last_name}
              </h1>
              <p className="text-slate-400">{eventDirector.user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {eventDirector.is_active ? (
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
              onClick={() => navigate('/admin/event-directors')}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Event Directors
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
            {/* Event Director Info */}
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Event Director Information</h2>
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
                  <label className="text-slate-400 text-sm">Preferred Name</label>
                  <p className="text-white">{eventDirector.preferred_name || '-'}</p>
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
                    <p className={eventDirector.is_active ? 'text-green-400' : 'text-red-400'}>
                      {eventDirector.is_active ? 'Active' : 'Inactive'}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-slate-400 text-sm">Specialized Formats</label>
                  <p className="text-white">
                    {eventDirector.specialized_formats?.length > 0
                      ? eventDirector.specialized_formats.join(', ')
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
                  <p className="text-white">{eventDirector.city}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">State</label>
                  <p className="text-white">{eventDirector.state}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Country</label>
                  <p className="text-white">{eventDirector.country}</p>
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
                  placeholder="Event Director bio..."
                />
              ) : (
                <p className="text-slate-300 whitespace-pre-wrap">
                  {eventDirector.bio || <span className="text-slate-500 italic">No bio provided</span>}
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
                  <span className="text-slate-400">Events Directed</span>
                  <span className="text-white font-bold">{eventDirector.total_events_directed || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Average Rating</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    {eventDirector.average_rating?.toFixed(1) || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Ratings</span>
                  <span className="text-white font-bold">{eventDirector.total_ratings || 0}</span>
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
                  <span className="text-white">{formatDate(eventDirector.approved_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white">{formatDate(eventDirector.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="text-white">{formatDate(eventDirector.updated_at)}</span>
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
                  {eventDirector.admin_notes || <span className="text-slate-500 italic">No notes</span>}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
