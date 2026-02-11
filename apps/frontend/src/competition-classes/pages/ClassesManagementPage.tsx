import { useState, useEffect } from 'react';
import { Award, Plus, Edit, Trash2, Filter, ArrowLeft, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CompetitionFormat } from '@/types/database';
import { useAuth } from '@/auth';
import { seasonsApi, Season } from '@/seasons';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';
import { competitionFormatsApi, CompetitionFormat as FormatObject } from '@/competition-formats';

export default function ClassesManagementPage() {
  const { user: _user } = useAuth();
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<CompetitionClass[]>([]);
  const [formats, setFormats] = useState<FormatObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<CompetitionClass | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<CompetitionFormat | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'abbreviation' | 'display_order'>('display_order');

  // Bulk Delete
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    format: 'SPL' as CompetitionFormat,
    season_id: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchSeasons();
    fetchFormats();
  }, []);

  // Auto-select current season when seasons are loaded
  useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      const currentSeason = seasons.find(s => s.isCurrent);
      if (currentSeason) {
        setSelectedSeasonId(currentSeason.id);
      } else {
        // If no current season, select the first one
        setSelectedSeasonId(seasons[0].id);
      }
    }
  }, [seasons]);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchClasses();
    }
  }, [selectedSeasonId, selectedFormat]);

  useEffect(() => {
    applyFilters();
    // Clear selections when filters change
    setSelectedClassIds(new Set());
    setSelectAll(false);
  }, [classes, searchQuery, activeFilter, sortBy]);

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);
    } catch (error) {
      console.error('Error fetching seasons:', error);
      alert('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormats = async () => {
    try {
      const data = await competitionFormatsApi.getActive();
      setFormats(data);
    } catch (error) {
      console.error('Error fetching formats:', error);
      // Don't show alert for formats as it's not critical
    }
  };

  const fetchClasses = async () => {
    try {
      let data;
      if (selectedFormat) {
        // Get classes by format first
        const formatClasses = await competitionClassesApi.getByFormat(selectedFormat);
        // Filter by season
        data = formatClasses.filter(cls => cls.season_id === selectedSeasonId);
      } else {
        // Get classes by season
        data = await competitionClassesApi.getBySeason(selectedSeasonId);
      }
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      alert('Failed to load classes');
    }
  };

  const applyFilters = () => {
    let filtered = [...classes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cls) =>
          cls.name.toLowerCase().includes(query) ||
          cls.abbreviation.toLowerCase().includes(query)
      );
    }

    // Apply active/inactive filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((cls) =>
        activeFilter === 'active' ? cls.is_active : !cls.is_active
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'abbreviation':
          return a.abbreviation.localeCompare(b.abbreviation);
        case 'display_order':
        default:
          return a.display_order - b.display_order;
      }
    });

    setFilteredClasses(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
    setSortBy('display_order');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingClass) {
        await competitionClassesApi.update(editingClass.id, {
          name: formData.name,
          abbreviation: formData.abbreviation,
          format: formData.format,
          is_active: formData.is_active,
          display_order: formData.display_order,
        });
        alert('Class updated successfully!');
      } else {
        await competitionClassesApi.create({
          name: formData.name,
          abbreviation: formData.abbreviation,
          format: formData.format,
          season_id: formData.season_id,
          is_active: formData.is_active,
          display_order: formData.display_order,
        });
        alert('Class created successfully!');
      }
      resetForm();
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      alert('Failed to save class. Please try again.');
    }
  };

  const handleEdit = (classItem: CompetitionClass) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      abbreviation: classItem.abbreviation,
      format: classItem.format as CompetitionFormat,
      season_id: classItem.season_id,
      is_active: classItem.is_active,
      display_order: classItem.display_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) {
      return;
    }

    try {
      await competitionClassesApi.delete(id);
      alert('Class deleted successfully!');
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class. Please try again.');
    }
  };

  // Bulk selection handlers
  const handleSelectClass = (classId: string) => {
    const newSelected = new Set(selectedClassIds);
    if (newSelected.has(classId)) {
      newSelected.delete(classId);
    } else {
      newSelected.add(classId);
    }
    setSelectedClassIds(newSelected);
    setSelectAll(newSelected.size === filteredClasses.length && filteredClasses.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClassIds(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredClasses.map(c => c.id));
      setSelectedClassIds(allIds);
      setSelectAll(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClassIds.size === 0) {
      alert('Please select at least one class to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedClassIds.size} class(es)?\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);

    try {
      // Delete each selected class
      const deletePromises = Array.from(selectedClassIds).map(id =>
        competitionClassesApi.delete(id)
      );

      await Promise.all(deletePromises);

      alert(`Successfully deleted ${selectedClassIds.size} class(es)`);

      // Clear selection and refresh
      setSelectedClassIds(new Set());
      setSelectAll(false);
      fetchClasses();
    } catch (error: any) {
      console.error('Error deleting classes:', error);
      alert('Failed to delete some classes. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    const currentSeason = seasons.find(s => s.isCurrent);
    setFormData({
      name: '',
      abbreviation: '',
      format: selectedFormat as CompetitionFormat || 'SPL',
      season_id: selectedSeasonId || currentSeason?.id || '',
      is_active: true,
      display_order: classes.length,
    });
    setEditingClass(null);
    setShowForm(false);
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Competition Classes Management</h1>
            <p className="text-gray-400">Manage competition classes for each season and format</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Filters & Search</h3>
            </div>
            {(searchQuery || activeFilter !== 'all' || sortBy !== 'display_order') && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Season *</label>
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select Season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} {season.isCurrent ? '(Current)' : ''} {season.isNext ? '(Next)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as CompetitionFormat | '')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Formats</option>
                {formats.map((format) => (
                  <option key={format.id} value={format.name}>{format.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Classes</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or abbreviation..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'abbreviation' | 'display_order')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="display_order">Display Order</option>
                <option value="name">Class Name (A-Z)</option>
                <option value="abbreviation">Abbreviation (A-Z)</option>
              </select>
            </div>
          </div>

          {selectedSeasonId && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-sm text-gray-400">
                Showing <span className="text-white font-semibold">{filteredClasses.length}</span> of <span className="text-white font-semibold">{classes.length}</span> classes
              </p>
            </div>
          )}
        </div>

        {selectedSeasonId && (
          <>
            <div className="mb-6 flex gap-4">
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create New Class
              </button>
              {selectedClassIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-5 w-5" />
                  Delete Selected ({selectedClassIds.size})
                </button>
              )}
            </div>

            {showForm && (
              <div className="bg-slate-800 rounded-xl p-6 mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {editingClass ? 'Edit Class' : 'Create New Class'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Class Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Street 1"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Abbreviation *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.abbreviation}
                        onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                        placeholder="e.g., S1"
                        maxLength={10}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Format *
                      </label>
                      <select
                        required
                        value={formData.format}
                        onChange={(e) => setFormData({ ...formData, format: e.target.value as CompetitionFormat })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {formats.map((format) => (
                          <option key={format.id} value={format.name}>{format.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      {editingClass ? 'Update Class' : 'Create Class'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          disabled={filteredClasses.length === 0}
                          className="w-4 h-4 cursor-pointer rounded border-slate-500 bg-slate-600 text-orange-500 focus:ring-orange-500"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Order</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Abbreviation</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Format</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredClasses.map((classItem) => (
                      <tr key={classItem.id} className={`hover:bg-slate-750 ${selectedClassIds.has(classItem.id) ? 'bg-slate-700/50' : ''}`}>
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedClassIds.has(classItem.id)}
                            onChange={() => handleSelectClass(classItem.id)}
                            className="w-4 h-4 cursor-pointer rounded border-slate-500 bg-slate-600 text-orange-500 focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{classItem.display_order}</td>
                        <td className="px-6 py-4 text-white font-medium">{classItem.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-semibold rounded-full">
                            {classItem.abbreviation}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm">{classItem.format}</td>
                        <td className="px-6 py-4">
                          {classItem.is_active ? (
                            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-500/10 text-gray-400 text-xs font-semibold rounded-full">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(classItem)}
                              className="p-2 hover:bg-orange-600/10 text-orange-400 rounded-lg transition-colors"
                              title="Edit Class"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(classItem.id)}
                              className="p-2 hover:bg-red-600/10 text-red-400 rounded-lg transition-colors"
                              title="Delete Class"
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

              {filteredClasses.length === 0 && classes.length > 0 && (
                <div className="text-center py-12">
                  <Award className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No classes match your search/filter criteria</p>
                  <button
                    onClick={clearFilters}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {classes.length === 0 && (
                <div className="text-center py-12">
                  <Award className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No classes found for this season/format</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Create Your First Class
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {!selectedSeasonId && (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Award className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Please select a season to manage classes</p>
          </div>
        )}
      </div>
    </div>
  );
}
