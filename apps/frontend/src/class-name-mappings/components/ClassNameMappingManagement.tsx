import { useState, useEffect } from 'react';
import {
  Link2,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Search,
  ArrowRight,
} from 'lucide-react';
import {
  classNameMappingsApi,
  ClassNameMapping,
  UnmappedClass,
} from '@/class-name-mappings';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';

export default function ClassNameMappingManagement() {
  const [mappings, setMappings] = useState<ClassNameMapping[]>([]);
  const [unmappedClasses, setUnmappedClasses] = useState<UnmappedClass[]>([]);
  const [competitionClasses, setCompetitionClasses] = useState<CompetitionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    sourceName: '',
    targetClassId: '',
    sourceSystem: 'termlab',
    isActive: true,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingsData, unmappedData, classesData] = await Promise.all([
        classNameMappingsApi.getAll(),
        classNameMappingsApi.getUnmapped(),
        competitionClassesApi.getAll(),
      ]);
      setMappings(mappingsData);
      setUnmappedClasses(unmappedData);
      setCompetitionClasses(classesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await classNameMappingsApi.update(editingId, {
          sourceName: formData.sourceName,
          targetClassId: formData.targetClassId || undefined,
          sourceSystem: formData.sourceSystem,
          isActive: formData.isActive,
          notes: formData.notes || undefined,
        });
      } else {
        await classNameMappingsApi.create({
          sourceName: formData.sourceName,
          targetClassId: formData.targetClassId || undefined,
          sourceSystem: formData.sourceSystem,
          isActive: formData.isActive,
          notes: formData.notes || undefined,
        });
      }
      resetForm();
      fetchData();
    } catch (error: any) {
      alert('Error saving mapping: ' + error.message);
    }
  };

  const handleEdit = (mapping: ClassNameMapping) => {
    setEditingId(mapping.id);
    setFormData({
      sourceName: mapping.sourceName || mapping.source_name || '',
      targetClassId: mapping.targetClassId || mapping.target_class_id || '',
      sourceSystem: mapping.sourceSystem || mapping.source_system || 'termlab',
      isActive: mapping.isActive ?? mapping.is_active ?? true,
      notes: mapping.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;
    try {
      await classNameMappingsApi.delete(id);
      fetchData();
    } catch (error: any) {
      alert('Error deleting mapping: ' + error.message);
    }
  };

  const handleQuickMap = (unmapped: UnmappedClass) => {
    setFormData({
      sourceName: unmapped.className,
      targetClassId: '',
      sourceSystem: 'termlab',
      isActive: true,
      notes: `Auto-suggested from ${unmapped.count} unmapped result(s)`,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      sourceName: '',
      targetClassId: '',
      sourceSystem: 'termlab',
      isActive: true,
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getTargetClassName = (mapping: ClassNameMapping): string => {
    if (mapping.targetClass) {
      return `${mapping.targetClass.name} (${mapping.targetClass.format})`;
    }
    const classId = mapping.targetClassId || mapping.target_class_id;
    if (classId) {
      const cls = competitionClasses.find(c => c.id === classId);
      return cls ? `${cls.name} (${cls.format})` : 'Unknown Class';
    }
    return 'Not Mapped';
  };

  // Filter and search mappings
  const filteredMappings = mappings.filter(m => {
    const sourceName = m.sourceName || m.source_name || '';
    const matchesSearch = sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getTargetClassName(m).toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = m.isActive ?? m.is_active ?? true;
    const matchesFilter = filterActive === 'all' ||
      (filterActive === 'active' && isActive) ||
      (filterActive === 'inactive' && !isActive);

    return matchesSearch && matchesFilter;
  });

  // Group classes by format for the dropdown
  const classesByFormat = competitionClasses.reduce((acc, cls) => {
    const format = cls.format || 'Other';
    if (!acc[format]) acc[format] = [];
    acc[format].push(cls);
    return acc;
  }, {} as Record<string, CompetitionClass[]>);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Link2 className="h-6 w-6 text-orange-500" />
            Class Name Mappings
          </h2>
          <p className="text-gray-400 mt-1">
            Map external class names (from TermLab imports) to official MECA classes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Mapping
          </button>
        </div>
      </div>

      {/* Unmapped Classes Alert */}
      {unmappedClasses.length > 0 && (
        <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                Unmapped Classes Found ({unmappedClasses.length})
              </h3>
              <p className="text-yellow-300/80 text-sm mb-4">
                These class names from imported results don't have a mapping to official MECA classes.
                Results with unmapped classes will appear under "Unknown Results".
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unmappedClasses.slice(0, 9).map((unmapped, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-white font-medium">{unmapped.className}</p>
                      <p className="text-xs text-gray-400">
                        {unmapped.count} result(s) • {unmapped.format || 'No format'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleQuickMap(unmapped)}
                      className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white"
                      title="Create mapping"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {unmappedClasses.length > 9 && (
                <p className="text-yellow-300/60 text-sm mt-3">
                  And {unmappedClasses.length - 9} more unmapped classes...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            {editingId ? 'Edit Mapping' : 'Add New Mapping'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source Name (from import file) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sourceName}
                  onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Radical X Street/Trunk 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Class (official MECA class)
                </label>
                <select
                  value={formData.targetClassId}
                  onChange={(e) => setFormData({ ...formData, targetClassId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Select Target Class --</option>
                  {Object.entries(classesByFormat).map(([format, classes]) => (
                    <optgroup key={format} label={format}>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source System
                </label>
                <select
                  value={formData.sourceSystem}
                  onChange={(e) => setFormData({ ...formData, sourceSystem: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="termlab">TermLab</option>
                  <option value="excel">Excel Import</option>
                  <option value="manual">Manual Entry</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <div className="flex items-center gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: true })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={!formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: false })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={2}
                placeholder="Optional notes about this mapping..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                {editingId ? 'Update Mapping' : 'Create Mapping'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mappings List */}
      <div className="bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            Existing Mappings ({filteredMappings.length})
          </h3>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search mappings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {filteredMappings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No mappings found</p>
            {mappings.length === 0 && (
              <p className="text-sm mt-2">Create your first mapping to get started</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Source Name</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Target Class</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">System</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.map((mapping) => {
                  const isActive = mapping.isActive ?? mapping.is_active ?? true;
                  const sourceName = mapping.sourceName || mapping.source_name || '';
                  const sourceSystem = mapping.sourceSystem || mapping.source_system || 'termlab';

                  return (
                    <tr key={mapping.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{sourceName}</div>
                        {mapping.notes && (
                          <div className="text-xs text-gray-500 mt-1">{mapping.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-orange-500" />
                          <span className={mapping.targetClassId || mapping.target_class_id ? 'text-green-400' : 'text-gray-500'}>
                            {getTargetClassName(mapping)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-slate-600 text-gray-300 rounded text-xs uppercase">
                          {sourceSystem}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isActive ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <Check className="h-4 w-4" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500">
                            <X className="h-4 w-4" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(mapping)}
                            className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mapping.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
