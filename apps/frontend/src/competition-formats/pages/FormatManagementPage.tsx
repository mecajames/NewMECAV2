import { useState, useEffect } from 'react';
import { Award, Plus, Edit, Trash2, Search, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { competitionFormatsApi, CompetitionFormat } from '@/competition-formats';

export default function FormatManagementPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [formats, setFormats] = useState<CompetitionFormat[]>([]);
  const [filteredFormats, setFilteredFormats] = useState<CompetitionFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFormat, setEditingFormat] = useState<CompetitionFormat | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    abbreviation: string;
    description: string;
    is_active: boolean;
    display_order: number;
  }>({
    name: '',
    abbreviation: '',
    description: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchFormats();
  }, []);

  useEffect(() => {
    filterFormats();
  }, [formats, searchTerm, showActiveOnly]);

  const fetchFormats = async () => {
    try {
      setLoading(true);
      const data = await competitionFormatsApi.getAll();
      setFormats(data);
    } catch (error) {
      console.error('Error fetching formats:', error);
      alert('Failed to load competition formats');
    } finally {
      setLoading(false);
    }
  };

  const filterFormats = () => {
    let filtered = [...formats];

    // Filter by active status
    if (showActiveOnly) {
      filtered = filtered.filter(f => f.is_active);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by display_order
    filtered.sort((a, b) => a.display_order - b.display_order);

    setFilteredFormats(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingFormat) {
        await competitionFormatsApi.update(editingFormat.id, formData);
      } else {
        await competitionFormatsApi.create(formData);
      }

      await fetchFormats();
      resetForm();
      alert(`Format ${editingFormat ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Error saving format:', error);
      alert(`Failed to ${editingFormat ? 'update' : 'create'} format`);
    }
  };

  const handleEdit = (format: CompetitionFormat) => {
    setEditingFormat(format);
    setFormData({
      name: format.name,
      abbreviation: format.abbreviation || '',
      description: format.description || '',
      is_active: format.is_active,
      display_order: format.display_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this format? This action cannot be undone.')) {
      return;
    }

    try {
      await competitionFormatsApi.delete(id);
      await fetchFormats();
      alert('Format deleted successfully!');
    } catch (error) {
      console.error('Error deleting format:', error);
      alert('Failed to delete format. It may be in use by competition classes.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      abbreviation: '',
      description: '',
      is_active: true,
      display_order: 0,
    });
    setEditingFormat(null);
    setShowForm(false);
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-4">You must be an admin to access this page.</p>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Competition Formats</h1>
            <p className="text-gray-400">Manage competition format types</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Add Format Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Format
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Only Filter */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500 focus:ring-offset-slate-800"
                />
                <span>Show active formats only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Formats List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="text-gray-400 mt-4">Loading formats...</p>
          </div>
        ) : filteredFormats.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700">
            <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No formats found</p>
            <p className="text-gray-500 mt-2">
              {searchTerm || showActiveOnly ? 'Try adjusting your filters' : 'Create your first format to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredFormats.map((format) => (
              <div
                key={format.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 hover:border-orange-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{format.name}</h3>
                      {format.abbreviation && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500">
                          {format.abbreviation}
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          format.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {format.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {format.description && (
                      <p className="text-gray-400 mb-3">{format.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Display Order: {format.display_order}</span>
                      <span>Created: {new Date(format.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(format)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Edit format"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(format.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete format"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingFormat ? 'Edit Format' : 'Add New Format'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Format Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!!editingFormat}
                    className={`w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      editingFormat ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    placeholder="e.g., SPL, SQL, Show and Shine"
                  />
                  {editingFormat && (
                    <p className="text-sm text-gray-500 mt-1">
                      Name cannot be changed after creation
                    </p>
                  )}
                </div>

                {/* Abbreviation */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Abbreviation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.abbreviation}
                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                    disabled={!!editingFormat}
                    className={`w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      editingFormat ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    placeholder="e.g., SPL, SQL, SNS"
                    maxLength={10}
                  />
                  {editingFormat && (
                    <p className="text-sm text-gray-500 mt-1">
                      Abbreviation cannot be changed after creation
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Brief description of this competition format"
                  />
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Order *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Lower numbers appear first in lists
                  </p>
                </div>

                {/* Active Status */}
                <div>
                  <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500 focus:ring-offset-slate-800"
                    />
                    <span>Active (visible to users)</span>
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    {editingFormat ? 'Update Format' : 'Create Format'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
