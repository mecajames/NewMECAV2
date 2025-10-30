import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, Trash2, Check, X, ArrowLeft, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Season, CompetitionFormat } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';

export default function SeasonManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromSeasonId, setCopyFromSeasonId] = useState<string>('');
  const [copyToSeasonId, setCopyToSeasonId] = useState<string>('');
  const [copyFormat, setCopyFormat] = useState<CompetitionFormat | 'all'>('all');
  const [copying, setCopying] = useState(false);

  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
    is_next: false,
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('year', { ascending: false });

    if (!error && data) {
      setSeasons(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSeason) {
      // Update existing season
      const { error } = await supabase
        .from('seasons')
        .update({
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_current: formData.is_current,
          is_next: formData.is_next,
        })
        .eq('id', editingSeason.id);

      if (error) {
        alert('Error updating season: ' + error.message);
      } else {
        alert('Season updated successfully!');
        resetForm();
        fetchSeasons();
      }
    } else {
      // Create new season
      const { error} = await supabase
        .from('seasons')
        .insert({
          year: formData.year,
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_current: formData.is_current,
          is_next: formData.is_next,
        });

      if (error) {
        alert('Error creating season: ' + error.message);
      } else {
        alert('Season created successfully!');
        resetForm();
        fetchSeasons();
      }
    }
  };

  const handleEdit = (season: Season) => {
    setEditingSeason(season);
    setFormData({
      year: season.year,
      name: season.name,
      start_date: season.start_date.split('T')[0],
      end_date: season.end_date.split('T')[0],
      is_current: season.is_current,
      is_next: season.is_next,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this season? This will also delete all associated classes.')) {
      return;
    }

    const { error } = await supabase
      .from('seasons')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting season: ' + error.message);
    } else {
      alert('Season deleted successfully!');
      fetchSeasons();
    }
  };

  const setAsCurrent = async (id: string) => {
    // First, set all seasons to not current
    await supabase
      .from('seasons')
      .update({ is_current: false, is_next: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Then set this season as current
    const { error } = await supabase
      .from('seasons')
      .update({ is_current: true, is_next: false })
      .eq('id', id);

    if (error) {
      alert('Error setting current season: ' + error.message);
    } else {
      alert('Current season updated!');
      fetchSeasons();
    }
  };

  const setAsNext = async (id: string) => {
    // First, set all seasons to not next
    await supabase
      .from('seasons')
      .update({ is_next: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Then set this season as next (and ensure not current)
    const { error } = await supabase
      .from('seasons')
      .update({ is_next: true, is_current: false })
      .eq('id', id);

    if (error) {
      alert('Error setting next season: ' + error.message);
    } else {
      alert('Next season updated!');
      fetchSeasons();
    }
  };

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear() + 1,
      name: '',
      start_date: '',
      end_date: '',
      is_current: false,
      is_next: false,
    });
    setEditingSeason(null);
    setShowForm(false);
  };

  const handleCopyClasses = async () => {
    if (!copyFromSeasonId || !copyToSeasonId) {
      alert('Please select both source and destination seasons');
      return;
    }

    if (copyFromSeasonId === copyToSeasonId) {
      alert('Source and destination seasons must be different');
      return;
    }

    if (!confirm(`Are you sure you want to copy ${copyFormat === 'all' ? 'all' : copyFormat} classes from the source season to the destination season?`)) {
      return;
    }

    setCopying(true);

    try {
      // Fetch classes from source season
      let query = supabase
        .from('competition_classes')
        .select('*')
        .eq('season_id', copyFromSeasonId);

      if (copyFormat !== 'all') {
        query = query.eq('format', copyFormat);
      }

      const { data: sourceClasses, error: fetchError } = await query;

      if (fetchError) {
        alert('Error fetching classes: ' + fetchError.message);
        setCopying(false);
        return;
      }

      if (!sourceClasses || sourceClasses.length === 0) {
        alert('No classes found to copy');
        setCopying(false);
        return;
      }

      // Copy classes to destination season
      const classesToInsert = sourceClasses.map(cls => ({
        name: cls.name,
        abbreviation: cls.abbreviation,
        format: cls.format,
        season_id: copyToSeasonId,
        is_active: cls.is_active,
        display_order: cls.display_order,
      }));

      const { error: insertError } = await supabase
        .from('competition_classes')
        .insert(classesToInsert);

      if (insertError) {
        alert('Error copying classes: ' + insertError.message);
      } else {
        alert(`Successfully copied ${sourceClasses.length} classes!`);
        setShowCopyDialog(false);
        setCopyFromSeasonId('');
        setCopyToSeasonId('');
        setCopyFormat('all');
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }

    setCopying(false);
  };

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
            <h1 className="text-4xl font-bold text-white mb-2">Season Management</h1>
            <p className="text-gray-400">Manage competition seasons and their dates</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create New Season
          </button>
          <button
            onClick={() => setShowCopyDialog(!showCopyDialog)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Copy className="h-5 w-5" />
            Copy Classes Between Seasons
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingSeason ? 'Edit Season' : 'Create New Season'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Year *
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2100"
                    required
                    disabled={!!editingSeason}
                    value={formData.year}
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      setFormData({
                        ...formData,
                        year,
                        name: `${year} Season`,
                        start_date: `${year}-01-01`,
                        end_date: `${year}-12-31`
                      });
                    }}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-600 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 2025 Season"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_current}
                    onChange={(e) => setFormData({ ...formData, is_current: e.target.checked, is_next: false })}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                  />
                  <span>Current Season</span>
                </label>

                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_next}
                    onChange={(e) => setFormData({ ...formData, is_next: e.target.checked, is_current: false })}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                  />
                  <span>Next Season</span>
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {editingSeason ? 'Update Season' : 'Create Season'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {showCopyDialog && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Copy Classes Between Seasons</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Copy From Season *
                  </label>
                  <select
                    value={copyFromSeasonId}
                    onChange={(e) => setCopyFromSeasonId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Source Season</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name} ({season.year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Copy To Season *
                  </label>
                  <select
                    value={copyToSeasonId}
                    onChange={(e) => setCopyToSeasonId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Destination Season</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name} ({season.year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Format
                  </label>
                  <select
                    value={copyFormat}
                    onChange={(e) => setCopyFormat(e.target.value as CompetitionFormat | 'all')}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Formats</option>
                    <option value="SPL">SPL</option>
                    <option value="SQL">SQL</option>
                    <option value="Show and Shine">Show and Shine</option>
                    <option value="Ride the Light">Ride the Light</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCopyClasses}
                  disabled={copying || !copyFromSeasonId || !copyToSeasonId}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copying ? 'Copying...' : 'Copy Classes'}
                </button>
                <button
                  onClick={() => {
                    setShowCopyDialog(false);
                    setCopyFromSeasonId('');
                    setCopyToSeasonId('');
                    setCopyFormat('all');
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Year</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Dates</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {seasons.map((season) => (
                  <tr key={season.id} className="hover:bg-slate-750">
                    <td className="px-6 py-4 text-white font-semibold">{season.year}</td>
                    <td className="px-6 py-4 text-gray-300">{season.name}</td>
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {season.is_current && (
                          <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full">
                            Current
                          </span>
                        )}
                        {season.is_next && (
                          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-full">
                            Next
                          </span>
                        )}
                        {!season.is_current && !season.is_next && (
                          <span className="px-3 py-1 bg-gray-500/10 text-gray-400 text-xs font-semibold rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!season.is_current && (
                          <button
                            onClick={() => setAsCurrent(season.id)}
                            className="p-2 hover:bg-green-600/10 text-green-400 rounded-lg transition-colors"
                            title="Set as Current Season"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {!season.is_next && !season.is_current && (
                          <button
                            onClick={() => setAsNext(season.id)}
                            className="p-2 hover:bg-blue-600/10 text-blue-400 rounded-lg transition-colors"
                            title="Set as Next Season"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(season)}
                          className="p-2 hover:bg-orange-600/10 text-orange-400 rounded-lg transition-colors"
                          title="Edit Season"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(season.id)}
                          className="p-2 hover:bg-red-600/10 text-red-400 rounded-lg transition-colors"
                          title="Delete Season"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {seasons.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No seasons created yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                Create Your First Season
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
